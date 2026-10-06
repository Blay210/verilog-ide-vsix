import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, mkdtemp, cp, readdir, stat, readFile, writeFile, rename } from 'node:fs/promises';
import { loadProject, runTests, selectTests, readHistory, loadRecordedInputs, compareResultInputs, prepareProject } from '@rtl-dev/core';
import { detectTools, detectSemanticRuntime } from '@rtl-dev/toolchain';
import { SlangProvider } from '@rtl-dev/semantic';
import { VerilatorBackend } from '@rtl-dev/verilator';

test('real package project: automatic order and concurrent isolated VCD runs', { skip: process.env.RTL_INTEGRATION !== '1', timeout: 240000 }, async () => {
  const base = path.resolve('.dev/integration'); await mkdir(base, { recursive: true });
  const root = await mkdtemp(path.join(base, 'parallel-'));
  const projectRoot = path.join(root, '한글 project');
  await cp('examples/package-counter', projectRoot, { recursive: true, filter: source => !source.split(path.sep).includes('.rtl') });
  const project = await loadProject(projectRoot); project.tests.forEach(t => t.timeoutMs = 120000);
  const tools = await detectTools(), python = await detectSemanticRuntime(); assert.ok(tools.toolchain); assert.ok(python);
  const provider = new SlangProvider(python, path.resolve('packages/semantic/python/analyze.py'), path.join(root, 'cache'));
  let active = 0, peak = 0;
  const results = await runTests(project, selectTests(project, { tags: ['smoke'] }), new VerilatorBackend(tools.toolchain), {
    packageProvider: provider, onStart: () => { peak = Math.max(peak, ++active); }, onResult: () => { active--; }
  });
  assert.equal(peak, 2); assert.equal(active, 0); assert.equal(results.length, 2);
  assert.notEqual(results[0].directory, results[1].directory);
  for (const result of results) {
    assert.equal(result.status, 'passed', result.message);
    assert.equal(result.inputSnapshot?.state, 'ready');
    assert.ok(result.waveform); assert.ok((await stat(result.waveform)).size > 0);
    assert.deepEqual(result.sources?.slice(0, 3).map(f => path.basename(f)), ['base_pkg.sv', 'width_pkg.sv', 'counter_pkg.sv']);
  }
  const prepared = await prepareProject(project, provider);
  for (const result of results) assert.equal((await compareResultInputs(result, prepared)).state, 'matching');
  const originalPackage = project.packageSources![0], originalBytes = await readFile(originalPackage);
  const manifest = path.join(projectRoot, 'rtl.toml'), backup = path.join(projectRoot, '.rtl/manifest-backup.toml');
  await rename(manifest, backup);
  try {
    await writeFile(originalPackage, 'invalid current package');
    for (const result of results) {
      const saved = await loadRecordedInputs(result);
      const hierarchy = await provider.hierarchy(saved.project, saved.target.name, []);
      assert.ok(hierarchy.roots.some(node => node.module === saved.target.top), JSON.stringify(hierarchy.diagnostics));
      assert.equal(hierarchy.diagnostics.filter(d => d.severity === 'error').length, 0, JSON.stringify(hierarchy.diagnostics));
    }
  } finally { await writeFile(originalPackage, originalBytes); await rename(backup, manifest); }
  assert.equal((await readHistory(projectRoot)).length, 2);
  assert.deepEqual((await readdir(projectRoot)).sort(), ['.gitignore', '.rtl', 'README.md', 'rtl', 'rtl.toml', 'tb']);
});
