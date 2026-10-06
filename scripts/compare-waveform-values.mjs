import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { performance } from 'node:perf_hooks';
import { build } from 'esbuild';

// Isolated plain A/B workers. Reference differs only by short-value reuse.
const gc = async () => { for (let i = 0; i < 3; i++) { global.gc(); await new Promise(resolve => setImmediate(resolve)); } };
const hash = value => createHash('sha256').update(value).digest('hex');
if (!isMainThread) {
  assert.equal(typeof global.gc, 'function');
  const { parseVcd } = createRequire(import.meta.url)(workerData.bundle);
  const text = await readFile(workerData.file, 'utf8');
  parseVcd('$scope module t $end $var wire 1 ! a $end $upscope $end $enddefinitions $end #0 0!');
  await gc(); const baseline = process.memoryUsage().heapUsed;
  const started = performance.now(); const data = parseVcd(text); const parseMs = performance.now() - started;
  await gc(); const live = process.memoryUsage().heapUsed;
  const digest = createHash('sha256');
  digest.update(JSON.stringify({ ...data, channels: undefined }));
  let transitions = 0;
  for (const [code, changes] of data.channels) {
    digest.update(code + '\n');
    for (const change of changes) { digest.update(change.time + ':' + change.value + '\n'); transitions++; }
  }
  parentPort.postMessage({ variant: workerData.variant, case: workerData.name, sourceHash: hash(text), digest: digest.digest('hex'),
    parseMs, baselineHeapBytes: baseline, liveHeapBytes: live, retainedHeapBytes: live - baseline, transitions });
} else {
  assert.equal(typeof global.gc, 'function', 'Run with node --expose-gc');
  await mkdir('.dev/value-reuse', { recursive: true });
  const root = await mkdtemp(path.resolve('.dev/value-reuse/run-'));
  const sourcePath = path.resolve('packages/waveform/src/vcd.ts');
  const source = await readFile(sourcePath, 'utf8');
  const begin = source.indexOf('  // Local short-value reuse:');
  const end = source.indexOf('  let timescale:', begin);
  assert.ok(begin > 0 && end > begin, 'Reference removal anchors changed. Review the comparison.');
  const valueBegin = source.indexOf('      // Reuse normalized short values only,');
  const valueEnd = source.indexOf('      // End short-value reuse.', valueBegin);
  assert.ok(valueBegin > end && valueEnd > valueBegin, 'Value reuse anchors changed.');
  const reference = source.slice(0, begin) + source.slice(end, valueBegin) + source.slice(valueEnd + '      // End short-value reuse.'.length);
  const bundles = {};
  for (const variant of ['reference', 'candidate']) {
    bundles[variant] = path.join(root, variant + '.cjs');
    await build({ stdin: { contents: variant === 'reference' ? reference : source, resolveDir: path.dirname(sourcePath), sourcefile: 'vcd.ts', loader: 'ts' },
      bundle: true, platform: 'node', format: 'cjs', outfile: bundles[variant] });
  }
  const latest = JSON.parse(await readFile('.dev/waveform-scale-latest.json', 'utf8'));
  const cases = [{ name: 'repeated-8-bit', file: path.join(latest.root, 'signals-4096-steps-192.vcd') }];
  // 16-bit values exceed entry and character budgets; 256-bit unique values
  // bypass the pool. Both still exercise many transitions and token overhead.
  for (const [name, width] of [['unique-16-bit', 16], ['unique-wide', 256]]) {
    const lines = ['$timescale 1 ps $end', '$scope module top $end'];
    for (let id = 0; id < 1024; id++) lines.push(`$var wire ${width} c${id} v${id} $end`);
    lines.push('$upscope $end', '$enddefinitions $end');
    for (let step = 0; step < 64; step++) {
      lines.push('#' + (9007199254740993n + BigInt(step)));
      for (let id = 0; id < 1024; id++) lines.push(`b${(step * 1024 + id).toString(2).padStart(width, '0')} c${id}`);
    }
    const file = path.join(root, name + '.vcd'); await writeFile(file, lines.join('\n')); cases.push({ name, file });
  }
  const report = { version: 1, node: process.version, root, sourceHash: hash(source), synthetic: true, runs: [],
    notes: ['Fresh sequential workers, explicit worker-local GC; no inspector. Timings are local observations, not IDE acceptance.',
      'Reference is current parser with the local pool and share call removed; all other code is identical.',
      'Heap delta retains input text and parsed data. RSS and native renderer are not measured.'] };
  // Alternate AB/BA order to reduce order bias. Never run other checks in parallel.
  for (const item of cases) for (let round = 0; round < 4; round++) {
    const pair = [];
    for (const variant of round % 2 ? ['candidate', 'reference'] : ['reference', 'candidate']) {
      const result = await new Promise((resolve, reject) => {
        const worker = new Worker(new URL(import.meta.url), { workerData: { ...item, variant, bundle: bundles[variant] } });
        let result; worker.once('message', value => { result = value; }); worker.once('error', reject);
        worker.once('exit', code => code === 0 && result ? resolve(result) : reject(Error('Comparison worker exit: ' + code)));
      });
      report.runs.push({ round, ...result }); pair.push(result);
    }
    assert.equal(pair[0].digest, pair[1].digest); assert.equal(pair[0].sourceHash, pair[1].sourceHash);
    console.log(JSON.stringify({ case: item.name, round, pair: pair.map(r => ({ variant: r.variant, parseMs: r.parseMs, retainedMiB: r.retainedHeapBytes / 1048576 })) }));
  }
  report.passed = true; // Equal data and successful exits, not timing acceptance.
  await writeFile(path.join(root, 'report.json'), JSON.stringify(report, null, 2));
  await writeFile('.dev/value-reuse-latest.json', JSON.stringify(report, null, 2));
  console.log('Comparison report: ' + path.join(root, 'report.json'));
}
