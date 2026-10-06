import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createProject, loadProject, runTest, loadRecordedInputs, type SimulatorBackend } from '@rtl-dev/core';
import { detectTools, detectSemanticRuntime, toolsHome } from '@rtl-dev/toolchain';
import { VerilatorBackend } from '@rtl-dev/verilator';
import { SlangProvider } from '@rtl-dev/semantic';

test('native simulator and semantic provider consume recorded inputs after original source changes', { skip: process.env.RTL_INTEGRATION !== '1', timeout: 180000 }, async () => {
  const tools = await detectTools(); assert.ok(tools.toolchain);
  const native = new VerilatorBackend(tools.toolchain);
  const base = path.resolve('.dev/integration'); await mkdir(base, { recursive: true });
  const root = await mkdtemp(path.join(base, 'snapshot-한글 ')); await createProject(root, true);
  const project = await loadProject(root); project.tests[0].timeoutMs = 120000;
  const original = await readFile(project.sources[0]);
  const wrapped: SimulatorBackend = { id: native.id, capabilities: native.capabilities, check: c => native.check(c), run: (a,c) => native.run(a,c),
    build: async (request, context) => {
      await writeFile(project.sources[0], 'invalid original source after snapshot');
      return native.build(request, context);
    } };
  const result = await runTest(project, project.tests[0], wrapped);
  assert.equal(result.status, 'passed', result.message); assert.equal(result.inputSnapshot?.state, 'ready');
  assert.ok(result.waveform?.endsWith('.vcd'));
  const saved = await loadRecordedInputs(result);
  assert.deepEqual(await readFile(saved.project.sources[0]), original);
  const runtime = await detectSemanticRuntime(); assert.ok(runtime, 'Semantic runtime is required for archived-context acceptance.');
  const provider = new SlangProvider(runtime, path.resolve('packages/semantic/python/analyze.py'), path.join(toolsHome(), 'cache', 'semantic'));
  const hierarchy = await provider.hierarchy(saved.project, saved.target.name, []);
  assert.ok(hierarchy.roots.some(node => node.module === saved.target.top));
  assert.equal(hierarchy.diagnostics.filter(d => d.severity === 'error').length, 0, JSON.stringify(hierarchy.diagnostics));
});
