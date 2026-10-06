import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, mkdtemp, writeFile, readFile, open } from 'node:fs/promises';
import { createProject, loadProject, captureInputs, compareResultInputs, runTest, readHistory, type SimulatorBackend } from '@rtl-dev/core';

async function fixture() {
  const base = path.resolve('.dev/tests'); await mkdir(base, { recursive: true });
  const root = await mkdtemp(path.join(base, 'identity-한글 ')); await createProject(root, true);
  return loadProject(root);
}
const backend = (effect: () => Promise<void> = async () => {}): SimulatorBackend => ({
  id: 'verilator', capabilities: { timing: true, waveforms: ['vcd', 'fst', 'none'] }, check: async () => {},
  build: async request => { await effect(); return { executable: 'mock', cwd: request.directory }; }, run: async () => {}
});

test('run identity persists, old records survive, source/settings/project changes are distinguished', async () => {
  const project = await fixture(), target = project.tests[0];
  const result = await runTest(project, target, backend());
  assert.match(result.runId!, /^[a-f0-9-]{36}$/);
  assert.equal(result.inputIdentity?.state, 'observed-stable');
  assert.equal((await compareResultInputs(result, project)).state, 'matching');
  const history = await readHistory(project.root);
  assert.deepEqual(history[0].inputIdentity, result.inputIdentity);
  assert.equal(history[0].runId, result.runId);
  assert.equal((await compareResultInputs(result, { ...project, defines: { WIDTH: '8' } })).state, 'changed');
  assert.equal((await compareResultInputs(result, await fixture())).state, 'changed');
  await writeFile(target.sources[0], '// changed');
  assert.equal((await compareResultInputs(result, project)).state, 'changed');
  const record = path.join(result.directory, 'result.json');
  const legacy = { ...result }; delete legacy.inputIdentity; delete legacy.runId;
  await writeFile(record, JSON.stringify(legacy));
  assert.equal((await compareResultInputs((await readHistory(project.root))[0], project)).state, 'legacy');
  await writeFile(record, JSON.stringify({ ...result, inputIdentity: { version: 99 } }));
  assert.equal((await compareResultInputs((await readHistory(project.root))[0], project)).state, 'unavailable');
});

test('literal external headers, include contents and newly added shadow inputs affect comparison', async () => {
  const project = await fixture(), target = project.tests[0];
  const include = path.join(project.root, 'include'); await mkdir(include);
  const header = path.join(include, 'width.svh'); await writeFile(header, '`define WIDTH 8');
  await writeFile(project.sources[0], '`include "width.svh"\nmodule dut; endmodule');
  project.includeDirs = [include];
  const result = await runTest(project, target, backend());
  assert.equal((await compareResultInputs(result, project)).state, 'matching');
  await writeFile(header, '`define WIDTH 16');
  assert.equal((await compareResultInputs(result, project)).state, 'changed');
  await writeFile(header, '`define WIDTH 8');
  await writeFile(path.join(path.dirname(project.sources[0]), 'width.svh'), '`define WIDTH 8');
  assert.equal((await compareResultInputs(result, project)).state, 'changed');
});

test('mid-run source edits are uncertain even when compared to original inputs', async () => {
  const project = await fixture(), target = project.tests[0], source = project.sources[0];
  const original = await readFile(source);
  const result = await runTest(project, target, backend(async () => { await writeFile(source, '// changed during build'); }));
  assert.equal(result.status, 'passed');
  assert.equal(result.inputIdentity?.state, 'changed-during-run');
  await writeFile(source, original);
  assert.equal((await compareResultInputs(result, project)).state, 'changed');
});

test('dynamic/missing includes disable identity while preserving simulation results; cancellation stays distinct', async () => {
  const project = await fixture(), target = project.tests[0];
  for (const text of ['`include `HEADER', '`include "missing.svh"']) {
    await writeFile(project.sources[0], text);
    const result = await runTest(project, target, backend());
    assert.equal(result.status, 'passed');
    assert.equal((await compareResultInputs(result, project)).state, 'unavailable');
  }
  const controller = new AbortController(); controller.abort();
  const result = await runTest(project, target, backend(), { signal: controller.signal });
  assert.equal(result.status, 'cancelled'); assert.ok(result.runId);
  assert.equal(result.inputIdentity?.state, 'unavailable');
});

test('fingerprints are deterministic, source order significant, define insertion order irrelevant', async () => {
  const project = await fixture(), target = project.tests[0];
  project.defines = { B: '2', A: '1' };
  const before = await captureInputs(project, target);
  assert.equal(before.fingerprint, (await captureInputs({ ...project, defines: { A: '1', B: '2' } }, target)).fingerprint);
  const extra = path.join(project.root, 'rtl/extra.sv'); await writeFile(extra, 'module extra; endmodule');
  assert.notEqual((await captureInputs({ ...project, sources: [...project.sources, extra] }, target)).fingerprint,
    (await captureInputs({ ...project, sources: [extra, ...project.sources] }, target)).fingerprint);
  assert.notEqual(before.fingerprint, (await captureInputs(project, { ...target, top: 'different' })).fingerprint);
});

test('oversized tracking inputs disable comparison without preventing simulation', async () => {
  const project = await fixture(), target = project.tests[0];
  const include = path.join(project.root, 'include'); await mkdir(include);
  const file = await open(path.join(include, 'oversized.bin'), 'w');
  try { await file.truncate(33 * 1024 * 1024); } finally { await file.close(); }
  project.includeDirs = [include];
  const result = await runTest(project, target, backend());
  assert.equal(result.status, 'passed');
  assert.equal(result.inputIdentity?.state, 'unavailable');
  assert.match(result.inputIdentity!.reason!, /byte limit/);
});
