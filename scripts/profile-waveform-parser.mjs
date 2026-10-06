import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { Session } from 'node:inspector';
import { performance } from 'node:perf_hooks';
import { getHeapStatistics } from 'node:v8';
import { build } from 'esbuild';

// Development-only isolated parser measurements. No profiler/GC in production.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const turn = () => new Promise(resolve => setImmediate(resolve));
const collect = async () => { for (let i = 0; i < 3; i++) { global.gc(); await turn(); } };
const memory = () => ({ ...process.memoryUsage(), heap: getHeapStatistics() });
const location = frame => ({ function: frame.functionName || '(anonymous)', url: frame.url, line: frame.lineNumber + 1 });

if (!isMainThread) {
  assert.equal(typeof global.gc, 'function', 'Run with --expose-gc; worker-local GC is required.');
  const require = createRequire(import.meta.url);
  const { parseVcd, queryValues } = require(workerData.bundle);
  let text = await readFile(workerData.file, 'utf8');
  const sourceHash = hash(text);
  // Initialize modules and regexp caches before each fresh worker baseline.
  parseVcd('$scope module t $end $var wire 1 ! a $end $upscope $end $enddefinitions $end #0 0!');
  await collect();
  const baseline = memory();
  const inspector = new Session();
  const post = (method, params = {}) => new Promise((resolve, reject) => inspector.post(method, params, (error, result) => error ? reject(error) : resolve(result)));
  if (workerData.mode !== 'plain') inspector.connect();
  if (workerData.mode === 'cpu') {
    await post('Profiler.enable'); await post('Profiler.setSamplingInterval', { interval: 1000 }); await post('Profiler.start');
  } else if (workerData.mode === 'allocation') {
    await post('HeapProfiler.startSampling', { samplingInterval: 32768, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
  }
  const start = performance.now();
  let data = parseVcd(text);
  const parseMs = performance.now() - start;
  let profile;
  if (workerData.mode === 'cpu') profile = (await post('Profiler.stop')).profile;
  if (workerData.mode === 'allocation') profile = (await post('HeapProfiler.stopSampling')).profile;
  if (workerData.mode !== 'plain') inspector.disconnect();
  const afterParse = memory();
  // All profiler memory is deliberately excluded from the plain live-heap runs.
  await collect();
  const live = memory();
  assert.equal(data.signals.length, 4096); assert.equal(data.changes, 786432);
  assert.equal(queryValues(data, { signals: ['0'], cursor: '9007199254740994' }).rows[0].value, 'zzzzzzzz');
  const fingerprint = createHash('sha256');
  const values = new Set(); let transitions = 0, valueCharacters = 0;
  for (const [code, changes] of data.channels) {
    fingerprint.update(code + '\n');
    for (const change of changes) {
      fingerprint.update(change.time + ':' + change.value + '\n');
      transitions++; valueCharacters += change.value.length; values.add(change.value);
    }
  }
  const contentHash = fingerprint.digest('hex');
  const report = { mode: workerData.mode, parseMs, sourceHash, contentHash, signals: data.signals.length,
    transitions, distinctValues: values.size, valueCharacters, baseline, afterParse, live,
    gcInWorker: true, notes: ['heapUsed and V8 heap statistics are this worker; RSS is process-wide.',
      'Forced GC is diagnostic only. Plain runs measure retained data with input text alive.',
      'Profiler runs perturb timing/heap; sampled bytes are statistical allocation estimates, not exact object sizes.'] };
  if (workerData.mode === 'plain') {
    // Retained-value experiment only: never used in product parsing. This does
    // not estimate the runtime/overhead of an interning lookup on every token.
    let canonical = new Map();
    for (const changes of data.channels.values()) for (const change of changes) {
      const existing = canonical.get(change.value);
      if (existing === undefined) canonical.set(change.value, change.value);
      else change.value = existing;
    }
    canonical = undefined; values.clear();
    await collect(); report.canonicalValuesLive = memory();
    const check = createHash('sha256');
    for (const [code, changes] of data.channels) {
      check.update(code + '\n');
      for (const change of changes) check.update(change.time + ':' + change.value + '\n');
    }
    assert.equal(check.digest('hex'), contentHash);
    assert.equal(queryValues(data, { signals: ['0'], cursor: '9007199254740994' }).rows[0].value, 'zzzzzzzz');
    report.canonicalValuesHashPreserved = true;
  }
  if (profile) {
    const artifact = path.join(workerData.root, workerData.mode === 'cpu' ? 'parse.cpuprofile' : 'parse.heapprofile');
    await writeFile(artifact, JSON.stringify(profile)); report.artifact = artifact;
    if (workerData.mode === 'cpu') {
      const counts = new Map();
      for (let i = 0; i < (profile.samples?.length ?? 0); i++) {
        const id = profile.samples[i], old = counts.get(id) ?? { samples: 0, sampledUs: 0 };
        old.samples++; old.sampledUs += profile.timeDeltas?.[i] ?? 0; counts.set(id, old);
      }
      report.top = profile.nodes.map(node => ({ ...location(node.callFrame), ...(counts.get(node.id) ?? { samples: 0, sampledUs: 0 }) }))
        .sort((a, b) => b.sampledUs - a.sampledUs).slice(0, 20);
    } else {
      const rows = [];
      const visit = node => { rows.push({ ...location(node.callFrame), sampledBytes: node.selfSize }); for (const child of node.children) visit(child); };
      visit(profile.head);
      report.sampledBytes = rows.reduce((sum, row) => sum + row.sampledBytes, 0);
      report.top = rows.sort((a, b) => b.sampledBytes - a.sampledBytes).slice(0, 20);
    }
  }
  profile = undefined; data = undefined; values.clear();
  await collect(); report.droppedDataTextRetained = memory();
  assert.equal(hash(text), sourceHash); text = undefined;
  await collect(); report.droppedDataAndText = memory();
  parentPort.postMessage(report);
} else {
  assert.equal(typeof global.gc, 'function', 'Use node --expose-gc scripts/profile-waveform-parser.mjs');
  const latest = JSON.parse(await readFile('.dev/waveform-scale-latest.json', 'utf8'));
  const file = path.join(latest.root, 'signals-4096-steps-192.vcd');
  const sourceHash = hash(await readFile(file));
  await mkdir('.dev/parser-profile', { recursive: true });
  const root = await mkdtemp(path.resolve('.dev/parser-profile/run-'));
  const bundle = path.join(root, 'parser.cjs');
  await build({ stdin: { contents: "export { parseVcd } from './packages/waveform/src/vcd'; export { queryValues } from './packages/waveform/src/query';", resolveDir: process.cwd(), sourcefile: 'parser-entry.ts' },
    bundle: true, platform: 'node', format: 'cjs', outfile: bundle });
  const report = { version: 1, synthetic: true, node: process.version, platform: process.platform,
    cpu: os.cpus()[0]?.model, startedAt: new Date().toISOString(), root, file, sourceHash, runs: [] };
  for (const mode of ['plain', 'plain', 'plain', 'cpu', 'allocation']) {
    const result = await new Promise((resolve, reject) => {
      const worker = new Worker(new URL(import.meta.url), { workerData: { mode, root, bundle, file } });
      let result;
      worker.once('message', message => { result = message; }); worker.once('error', reject);
      worker.once('exit', code => code === 0 && result ? resolve(result) : reject(Error('Profiler worker failed: ' + code)));
    });
    assert.equal(result.sourceHash, sourceHash);
    if (report.runs.length) assert.equal(result.contentHash, report.runs[0].contentHash);
    report.runs.push(result);
    console.log(JSON.stringify({ mode, parseMs: result.parseMs, liveHeapMiB: result.live.heapUsed / 1048576,
      dataHeapDeltaMiB: (result.live.heapUsed - result.baseline.heapUsed) / 1048576,
      canonicalValuesLiveMiB: result.canonicalValuesLive?.heapUsed / 1048576,
      droppedHeapMiB: result.droppedDataTextRetained.heapUsed / 1048576, distinctValues: result.distinctValues }));
  }
  assert.equal(hash(await readFile(file)), sourceHash);
  report.passed = true; // Functional invariants, not an IDE performance acceptance.
  await writeFile(path.join(root, 'report.json'), JSON.stringify(report, null, 2));
  await writeFile('.dev/parser-profile-latest.json', JSON.stringify(report, null, 2));
  console.log('Profile report: ' + path.join(root, 'report.json'));
}
