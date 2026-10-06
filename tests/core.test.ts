import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, mkdtemp, writeFile, readFile, readdir } from 'node:fs/promises';
import { createProject, loadProject, discover, runTest, runTests, type Project, type SimulatorBackend } from '@rtl-dev/core';

async function directory() { const base = path.resolve('.dev/tests'); await mkdir(base, { recursive: true }); return mkdtemp(path.join(base, 'core-')); }
test('example creation, config and source-first layout', async () => {
  const root = await directory(); await createProject(root, true);
  const project = await loadProject(root);
  assert.equal(project.tests.length, 2); assert.equal(project.waveform, 'vcd');
  assert.equal(project.tests[0].timeoutMs, 60000);
  assert.deepEqual((await readdir(root)).sort(), ['.gitignore', 'README.md', 'rtl', 'rtl.toml', 'tb']);
  await assert.rejects(createProject(root, true), /already exists/);
  assert.match(await readFile(path.join(root, 'tb/counter_basic_tb.sv'), 'utf8'), /`ifdef RTL_WAVEFORM/);
});
test('package order, glob order, deduplication and Unicode paths', async () => {
  const root = path.join(await directory(), '한글 project'); await mkdir(root);
  for (const file of ['b.sv', 'a.sv', 'pkg.sv']) await writeFile(path.join(root, file), '');
  assert.deepEqual((await discover(root, ['pkg.sv', '*.sv'])).map(f => path.basename(f)), ['pkg.sv', 'a.sv', 'b.sv']);
  await writeFile(path.join(root, 'rtl.toml'), 'version = 1\n[project]\nname="order"\n[sources]\npackages=["pkg.sv"]\nrtl=["*.sv"]\n');
  assert.equal(path.basename((await loadProject(root)).sources[0]), 'pkg.sv');
  await assert.rejects(discover(root, ['missing.sv']), /matched no files/);
});
test('invalid version, unknown settings and duplicate test names are rejected', async () => {
  const root = await directory(); await createProject(root, true);
  const file = path.join(root, 'rtl.toml'); const original = await readFile(file, 'utf8');
  for (const [text, message] of [[original.replace('version = 1', 'version = 2'), /version/], [original.replace('timing = true', 'timng = true'), /timng/], [original.replace('name = "counter_reset"', 'name = "COUNTER_BASIC"'), /Duplicate/]] as const) {
    await writeFile(file, text); await assert.rejects(loadProject(root), message);
  }
});
test('minimal initialization preserves existing gitignore and sources', async () => {
  const root = await directory(); await writeFile(path.join(root, '.gitignore'), 'custom');
  await writeFile(path.join(root, 'existing.sv'), 'module existing; endmodule');
  await createProject(root, false);
  assert.equal((await loadProject(root)).tests.length, 0);
  assert.equal(await readFile(path.join(root, '.gitignore'), 'utf8'), 'custom\n.rtl/\n');
  assert.equal(await readFile(path.join(root, 'existing.sv'), 'utf8'), 'module existing; endmodule');
});

const backend = (run: SimulatorBackend['run']): SimulatorBackend => ({ id: 'verilator', capabilities: { waveforms: ['vcd', 'fst', 'none'], timing: true }, check: async () => {}, build: async r => ({ executable: 'test', cwd: r.directory }), run });
async function fixture(): Promise<Project> { const root = await directory(); await createProject(root, true); return loadProject(root); }
test('result isolation and missing-waveform guidance', async () => {
  const project = await fixture();
  const results = await runTests(project, project.tests, backend(async (_, ctx) => { ctx?.onLog?.('completed\n'); }));
  assert.deepEqual(results.map(r => r.status), ['passed', 'passed']);
  assert.notEqual(results[0].directory, results[1].directory);
  for (const result of results) {
    assert.match(result.message!, /No waveform/);
    assert.match(await readFile(result.log, 'utf8'), /completed/);
    assert.equal(JSON.parse(await readFile(path.join(result.directory, 'result.json'), 'utf8')).status, 'passed');
  }
  assert.equal((await readdir(project.root)).filter(f => f === '.rtl').length, 1);
});
test('failure, timeout and cancellation remain distinct', async () => {
  const project = await fixture();
  const failed = await runTest(project, project.tests[0], backend(async () => { throw Error('assertion'); }));
  assert.equal(failed.status, 'failed');
  const blocked = backend(async (_, ctx) => { await new Promise<void>((_, reject) => ctx?.signal?.addEventListener('abort', () => reject(Error('aborted')), { once: true })); });
  const timed = await runTest(project, { ...project.tests[0], timeoutMs: 30 }, blocked);
  assert.equal(timed.status, 'timedOut');
  const controller = new AbortController(); controller.abort();
  const cancelled = await runTest(project, project.tests[0], blocked, { signal: controller.signal });
  assert.equal(cancelled.status, 'cancelled');
});

test('manual cancellation remains cancellation when cleanup extends beyond the timeout', async () => {
  const project = await fixture(), controller = new AbortController();
  const slowCleanup = backend(async (_, context) => {
    setTimeout(() => controller.abort(), 1);
    await new Promise<void>((_, reject) => context!.signal!.addEventListener('abort', () => {
      setTimeout(() => reject(Error('finished slow cleanup')), 80);
    }, { once: true }));
  });
  const result = await runTest(project, { ...project.tests[0], timeoutMs: 40 }, slowCleanup, { signal: controller.signal });
  assert.equal(result.status, 'cancelled');
  assert.ok(result.durationMs >= 80);
});
