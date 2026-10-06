import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdir, mkdtemp, writeFile, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { performance, monitorEventLoopDelay } from 'node:perf_hooks';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

// Synthetic reader baseline, not a user-design or full GUI acceptance claim.
const require = createRequire(import.meta.url);
const { WaveformSession } = require('../packages/waveform/dist/client.js');
const base = path.resolve('.dev/scale-tests'); await mkdir(base, { recursive: true });
const caseIndex = process.argv.includes('--case') ? Number(process.argv[process.argv.indexOf('--case') + 1]) : undefined;
const root = process.argv.includes('--root') ? path.resolve(process.argv[process.argv.indexOf('--root') + 1]) : await mkdtemp(path.join(base, 'waveform-'));
const cases = [[256, 64, 1], [4096, 192, 2], [8192, 120, 1]];
if (caseIndex !== undefined && !cases[caseIndex]) throw Error('Invalid scale case.');
const worker = path.join(root, 'worker.cjs');
await build({ entryPoints: ['packages/waveform/src/worker.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: worker });
const origin = 9007199254740993n;
const value = (id, step) => id % 128 === 0 && step % 17 === 0 ? 'xxxxxxxx' : id % 128 === 0 && step % 17 === 1 ? 'zzzzzzzz' : ((id + step) % 256).toString(2).padStart(8, '0');
function fixture(signals, steps) {
  const lines = ['$timescale 1 ps $end', '$scope module top $end'];
  for (let id = 0; id < signals; id++) lines.push(`$var wire 8 c${id} port_${id} [7:0] $end`);
  lines.push('$upscope $end', '$enddefinitions $end');
  for (let step = 0; step < steps; step++) {
    lines.push(`#${origin + BigInt(step)}`);
    for (let id = 0; id < signals; id++) lines.push(`b${value(id, step)} c${id}`);
  }
  return Buffer.from(lines.join('\n') + '\n');
}
const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * p))];
const summary = values => ({ count: values.length, p50Ms: percentile(values, .5), p95Ms: percentile(values, .95), maxMs: Math.max(...values) });
const report = { version: 1, synthetic: true, startedAt: new Date().toISOString(), node: process.version, platform: process.platform, cpu: os.cpus()[0]?.model, root,
  notes: ['RSS includes the parent and worker threads; parent heapUsed is not worker heap.', 'Each case runs in a fresh Node process. Parent-only GC after fixture generation excludes its temporary strings; it does not force worker GC or mimic UI memory.', 'Targets are provisional local baseline targets, not beta acceptance or portable CI time limits.'], cases: [] };
async function measure(signals, steps, readers) {
  const bytes = fixture(signals, steps), sha256 = createHash('sha256').update(bytes).digest('hex');
  const file = path.join(root, `signals-${signals}-steps-${steps}.vcd`); await writeFile(file, bytes);
  global.gc?.();
  const initialRss = process.memoryUsage().rss;
  let peakRss = initialRss, heartbeats = 0;
  const poll = setInterval(() => { heartbeats++; peakRss = Math.max(peakRss, process.memoryUsage().rss); }, 10);
  const delay = monitorEventLoopDelay({ resolution: 10 }); delay.enable();
  // Prime sampling before a synchronous message clone can block the host loop.
  await new Promise(resolve => setTimeout(resolve, 25));
  const sessions = Array.from({ length: readers }, () => new WaveformSession(worker));
  const started = performance.now();
  try {
    const loaded = await Promise.all(sessions.map(session => session.loadVerified(bytes, sha256)));
    const loadMs = performance.now() - started;
    loaded.forEach(parsed => { assert.equal(parsed.sha256, sha256); assert.equal(parsed.bytes, bytes.length); assert.equal(parsed.metadata.signals.length, signals); assert.equal(parsed.metadata.changes, signals * steps); });
    const ids = Array.from({ length: 32 }, (_, index) => String(Math.floor(index * (signals - 1) / 31)));
    const valuesMs = [], windowsMs = []; let maxWindowBytes = 0;
    for (let index = 0; index < 100; index++) {
      const step = index * 37 % steps, cursor = String(origin + BigInt(step)), start = performance.now();
      const result = await sessions[index % sessions.length].values({ signals: ids, cursor });
      valuesMs.push(performance.now() - start); assert.equal(result.cursor, cursor);
      result.rows.forEach(row => assert.equal(row.value, value(Number(row.id), step)));
    }
    for (let index = 0; index < 30; index++) {
      const cursor = String(origin + BigInt(index % steps)), start = performance.now();
      const result = await sessions[index % sessions.length].window({ signals: ids, from: String(origin), to: String(origin + BigInt(steps - 1)), cursor, pixels: 800 });
      windowsMs.push(performance.now() - start); maxWindowBytes = Math.max(maxWindowBytes, Buffer.byteLength(JSON.stringify(result)));
      result.rows.forEach(row => assert.equal(row.value, value(Number(row.id), index % steps)));
    }
    // Repeated bad reloads must clear data, while a valid retry restores it.
    const bad = Buffer.from('incomplete VCD'), badHash = createHash('sha256').update(bad).digest('hex');
    await assert.rejects(sessions[0].loadVerified(bad, badHash));
    await assert.rejects(sessions[0].values({ signals: ['0'], cursor: String(origin) }), /not loaded/);
    const retryStart = performance.now(); await sessions[0].loadVerified(bytes, sha256);
    const retryMs = performance.now() - retryStart;
    assert.equal((await sessions[0].values({ signals: ['0'], cursor: String(origin + 1n) })).rows[0].value, 'zzzzzzzz');
    assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'), sha256, 'Reads/reloads must not modify the waveform');
    peakRss = Math.max(peakRss, process.memoryUsage().rss);
    const result = { signals, steps, changes: signals * steps, bytes: bytes.length, readers, loadMs, retryMs, values: summary(valuesMs), windows: summary(windowsMs), maxWindowBytes,
      heartbeatCount: heartbeats, hostEventLoopMaxMs: delay.max / 1e6, hostEventLoopP95Ms: delay.percentile(95) / 1e6, initialRssBytes: initialRss, peakProcessRssBytes: peakRss, parentHeapBytes: process.memoryUsage().heapUsed,
      sourceHashPreserved: true };
    result.withinProvisionalTargets = loadMs < 30000 && result.values.p95Ms < 100 && result.windows.p95Ms < 250 && result.hostEventLoopMaxMs < 200 && maxWindowBytes < 4 * 1024 * 1024;
    return result;
  } finally { clearInterval(poll); delay.disable(); await Promise.all(sessions.map(session => session.dispose())); }
}
try {
  if (caseIndex === undefined) {
    for (let index = 0; index < cases.length; index++) {
      await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, ['--expose-gc', fileURLToPath(import.meta.url), '--case', String(index), '--root', root], { windowsHide: true, stdio: 'inherit' });
        child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(Error('Scale child failed: ' + code)));
      });
      const childReport = JSON.parse(await readFile(path.join(root, 'case-' + index + '.json'), 'utf8'));
      report.cases.push(...childReport.cases); if (childReport.cancellation) report.cancellation = childReport.cancellation;
    }
  } else {
    const result = await measure(...cases[caseIndex]); report.cases.push(result);
    console.log(JSON.stringify({ signals: result.signals, changes: result.changes, readers: result.readers, loadMs: result.loadMs, valuesP95Ms: result.values.p95Ms, windowsP95Ms: result.windows.p95Ms, peakRssMiB: result.peakProcessRssBytes / 1048576, targets: result.withinProvisionalTargets }));
    if (caseIndex === 2) {
      const file = path.join(root, 'signals-8192-steps-120.vcd'); const hash = createHash('sha256').update(await readFile(file)).digest('hex');
      const cancellationMs = [];
      for (let i = 0; i < 3; i++) {
        const session = new WaveformSession(worker);
        try {
          let settled = false;
          const loading = session.load(file);
          loading.then(() => { settled = true; }, () => { settled = true; });
          const pending = assert.rejects(loading, /cancelled|closed/);
          // Observe a failed assertion immediately even if a very fast machine
          // finishes parsing before disposal; cleanup still runs below.
          pending.catch(() => {});
          await new Promise(resolve => setTimeout(resolve, 150));
          assert.equal(settled, false, 'Cancellation must target an outstanding large load');
          const start = performance.now();
          await session.dispose(); await pending; cancellationMs.push(performance.now() - start);
          await assert.rejects(session.values({ signals: ['0'], cursor: String(origin) }), /closed/);
        } finally { await session.dispose(); }
      }
      assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'), hash);
      report.cancellation = { repeated: 3, pendingLoadBeforeDispose: true, delayBeforeDisposeMs: 150, terminationMs: summary(cancellationMs), waveformBytes: (await stat(file)).size, sourceHashPreserved: true };
    }
  }
  report.passedCorrectness = true;
} catch (error) { report.passedCorrectness = false; report.error = String(error); process.exitCode = 1; }
finally {
  report.finishedAt = new Date().toISOString();
  const reportFile = path.join(root, caseIndex === undefined ? 'report.json' : 'case-' + caseIndex + '.json');
  await writeFile(reportFile, JSON.stringify(report, null, 2));
  if (caseIndex === undefined) await writeFile('.dev/waveform-scale-latest.json', JSON.stringify(report, null, 2));
  console.log('Waveform scale report:', reportFile);
}
