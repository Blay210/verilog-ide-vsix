import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import { build } from 'esbuild';

// Reuses the medium fixture from verify-waveform-scale. No user project writes.
const require = createRequire(import.meta.url);
const { WaveformSession } = require('../packages/waveform/dist/client.js');
const previous = JSON.parse(await readFile('.dev/waveform-scale-latest.json', 'utf8'));
const source = path.join(previous.root, 'signals-4096-steps-192.vcd');
const bytes = await readFile(source), hash = createHash('sha256').update(bytes).digest('hex');
const base = path.resolve('.dev/scale-tests'); await mkdir(base, { recursive: true });
const root = await mkdtemp(path.join(base, 'lifecycle-')), workerFile = path.join(root, 'worker.cjs');
await build({ entryPoints: ['packages/waveform/src/worker.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: workerFile });
const origin = 9007199254740993n, cursor = String(origin + 1n);
const snapshot = () => { global.gc?.(); const { rss, heapUsed, external, arrayBuffers } = process.memoryUsage(); return { rss, parentHeapUsed: heapUsed, external, arrayBuffers }; };
const report = { version: 1, synthetic: true, root, source, node: process.version, forcedParentGc: !!global.gc, before: snapshot(), cycles: [],
  notes: ['Process RSS includes parent and threads. GC is parent-only; no forced worker GC.', 'Post-close RSS plateau is diagnostic, not a portable leak verdict or whole VS Code measurement.'] };
let started = 0, exited = 0, peakRss = report.before.rss;
const poll = setInterval(() => { peakRss = Math.max(peakRss, process.memoryUsage().rss); }, 10);
function session() {
  const reader = new WaveformSession(workerFile); started++;
  // Inspection belongs to this diagnostic harness, not the public product API.
  reader.worker.once('exit', () => { exited++; });
  return reader;
}
async function cycle(index) {
  const first = session(), peer = session(), start = performance.now();
  try {
    await Promise.all([first.loadVerified(bytes, hash), peer.loadVerified(bytes, hash)]);
    assert.equal((await peer.values({ signals: ['0'], cursor })).rows[0].value, 'zzzzzzzz');
    if (index % 2 === 0) {
      const bad = Buffer.from('malformed trace');
      await assert.rejects(first.loadVerified(bad, createHash('sha256').update(bad).digest('hex')));
      await assert.rejects(first.values({ signals: ['0'], cursor }), /not loaded/);
      await first.loadVerified(bytes, hash);
    }
    // Closing one reader with queued work must not stop or corrupt its peer.
    const queued = Array.from({ length: 12 }, () => first.window({ signals: ['0', '1'], from: String(origin), to: String(origin + 191n), cursor, pixels: 800 }));
    const observed = Promise.allSettled(queued);
    const closeA = first.dispose(), closeB = first.dispose();
    assert.equal(closeA, closeB); await Promise.all([closeA, closeB]);
    for (const result of await observed) if (result.status === 'rejected') assert.match(String(result.reason), /cancelled|closed/);
    assert.equal(first.worker.threadId, -1, 'Disposal must await worker exit');
    const value = await peer.values({ signals: ['0'], cursor }); assert.equal(value.rows[0].value, 'zzzzzzzz');
    await assert.rejects(first.values({ signals: ['0'], cursor }), /closed/);
    // A live peer reloads successfully after the other view has closed.
    await peer.loadVerified(bytes, hash);
    assert.equal((await peer.values({ signals: ['0'], cursor })).rows[0].value, 'zzzzzzzz');
    return { index, durationMs: performance.now() - start, peerPreserved: true, queuedRequests: queued.length };
  } finally { await Promise.all([first.dispose(), peer.dispose()]); }
}
try {
  for (let index = 0; index < 8; index++) {
    const result = await cycle(index);
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(started, exited, 'Every created worker must have exited after each cycle');
    result.afterClose = snapshot(); result.startedWorkers = started; result.exitedWorkers = exited;
    report.cycles.push(result);
    console.log(JSON.stringify({ cycle: index, rssMiB: result.afterClose.rss / 1048576, exited, started }));
  }
  report.after = snapshot(); report.peakProcessRssBytes = peakRss;
  report.postCloseRssGrowthBytes = report.after.rss - report.cycles[0].afterClose.rss;
  report.postCloseParentHeapGrowthBytes = report.after.parentHeapUsed - report.cycles[0].afterClose.parentHeapUsed;
  report.withinProvisionalRssPlateau = report.postCloseRssGrowthBytes < 64 * 1048576;
  assert.equal(createHash('sha256').update(await readFile(source)).digest('hex'), hash);
  report.sourceHashPreserved = true; report.passedCorrectness = true;
} catch (error) { report.passedCorrectness = false; report.error = String(error); process.exitCode = 1; }
finally {
  clearInterval(poll); report.startedWorkers = started; report.exitedWorkers = exited;
  await writeFile(path.join(root, 'report.json'), JSON.stringify(report, null, 2));
  await writeFile('.dev/waveform-lifecycle-latest.json', JSON.stringify(report, null, 2));
  console.log('Lifecycle report:', path.join(root, 'report.json'));
}
