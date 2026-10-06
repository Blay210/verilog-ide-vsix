import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, mkdtemp, writeFile, readdir, stat } from 'node:fs/promises';
import { createProject, loadProject, runTest, runTests } from '@rtl-dev/core';
import { detectTools, verifyToolchain } from '@rtl-dev/toolchain';
import { VerilatorBackend } from '@rtl-dev/verilator';

test('real Windows/native compiler: examples, waveforms and failures', { skip: process.env.RTL_INTEGRATION !== '1', timeout: 600000 }, async t => {
  const tools = await detectTools(); assert.ok(tools.toolchain, 'Install Verilator before integration tests');
  await verifyToolchain(tools.toolchain);
  const backend = new VerilatorBackend(tools.toolchain);
  const base = path.resolve('.dev/integration'); await mkdir(base, { recursive: true });
  const root = await mkdtemp(path.join(base, 'project-')); await createProject(root, true);
  const project = await loadProject(root);
  project.tests.forEach(target => target.timeoutMs = 120000);
  await t.test('run all VCD tests', async () => {
    const results = await runTests(project, project.tests, backend);
    for (const result of results) { assert.equal(result.status, 'passed', result.message); assert.ok(result.waveform); assert.ok((await stat(result.waveform)).size > 0); }
  });
  await t.test('selected FST test', async () => {
    const results = await runTests({ ...project, waveform: 'fst' }, [project.tests[1]], backend);
    assert.equal(results.length, 1); assert.equal(results[0].status, 'passed', results[0].message);
    assert.match(results[0].waveform!, /\.fst$/); assert.ok((await stat(results[0].waveform!)).size > 0);
  });
  await t.test('disabled waveform', async () => {
    const result = await runTest({ ...project, waveform: 'none' }, project.tests[0], backend);
    assert.equal(result.status, 'passed', result.message); assert.equal(result.waveform, undefined);
  });
  const source = path.join(root, 'tb', 'scenario.sv');
  const target = { name: 'scenario', top: 'scenario', sources: [source], timeoutMs: 120000 };
  const scenario = async (text: string) => { await writeFile(source, text); return runTest({ ...project, sources: [] }, target, backend); };
  await t.test('compile error', async () => { const result = await scenario('module scenario; not valid verilog!!! endmodule'); assert.equal(result.status, 'failed'); });
  await t.test('assertion failure', async () => { const result = await scenario('module scenario; initial begin assert (0) else $fatal(1, "expected failure"); $finish; end endmodule'); assert.equal(result.status, 'failed'); assert.match(result.message!, /expected failure/); });
  await t.test('missing waveform stays a successful simulation', async () => { const result = await scenario('module scenario; initial $finish; endmodule'); assert.equal(result.status, 'passed', result.message); assert.match(result.message!, /No waveform/); });
  await t.test('simulation cancellation and timeout', async () => {
    await writeFile(source, 'module scenario; initial forever #1; endmodule');
    const abort = new AbortController();
    const cancelled = await runTest({ ...project, sources: [] }, target, backend, { signal: abort.signal, onLog: text => { if (text.includes('Running scenario')) setTimeout(() => abort.abort(), 100); } });
    assert.equal(cancelled.status, 'cancelled');
    const timed = await runTest({ ...project, sources: [] }, { ...target, timeoutMs: 1000 }, backend);
    assert.equal(timed.status, 'timedOut');
  });
  await t.test('project folder with spaces and Korean characters', async () => {
    const unicodeRoot = path.join(root, '한글 project'); await createProject(unicodeRoot, true);
    const unicode = await loadProject(unicodeRoot);
    const result = await runTest(unicode, { ...unicode.tests[0], timeoutMs: 120000 }, backend);
    assert.equal(result.status, 'passed', result.message); assert.ok(result.waveform);
  });
  assert.deepEqual((await readdir(root)).filter(name => name !== '한글 project').sort(), ['.gitignore', '.rtl', 'README.md', 'rtl', 'rtl.toml', 'tb']);
});
