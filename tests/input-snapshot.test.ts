import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, mkdtemp, readFile, writeFile, chmod } from 'node:fs/promises';
import { createProject, loadProject, runTest, readHistory, loadRecordedInputs, compareResultInputs, prepareProject, type PackageDependencyProvider, type SimulatorBackend, type BuildRequest } from '@rtl-dev/core';

async function fixture() {
  const base = path.resolve('.dev/tests'); await mkdir(base, { recursive: true });
  const root = await mkdtemp(path.join(base, 'snapshot-한글 ')); await createProject(root, true); return loadProject(root);
}
function backend(build: (request: BuildRequest) => Promise<void> = async () => {}): SimulatorBackend {
  return { id: 'verilator', capabilities: { timing: true, waveforms: ['vcd','fst','none'], inputSnapshot: true }, check: async () => {},
    build: async request => { await build(request); return { executable: 'mock', cwd: request.directory }; }, run: async () => {} };
}

test('backend consumes retained bytes while originals change; history and archived context preserve exact inputs', async () => {
  const project = await fixture(), target = project.tests[0], file = project.sources[0], original = await readFile(file);
  const result = await runTest(project, target, backend(async request => {
    assert.notEqual(request.project.root, project.root);
    assert.ok(request.project.sources.every(source => source.startsWith(path.join(request.directory, 'inputs'))));
    await writeFile(file, '// changed before the backend reads its inputs');
    assert.deepEqual(await readFile(request.project.sources[0]), original);
  }));
  assert.equal(result.status, 'passed'); assert.equal(result.inputSnapshot?.state, 'ready');
  assert.equal((await compareResultInputs(result, project)).state, 'changed');
  const saved = await loadRecordedInputs((await readHistory(project.root))[0]);
  assert.deepEqual(await readFile(saved.project.sources[0]), original);
  assert.equal(saved.runId, result.runId);
  assert.equal(saved.project.tests[0].name, target.name);
  assert.deepEqual(saved.project.defines, project.defines);
  await writeFile(file, original);
  assert.equal((await compareResultInputs(result, project)).state, 'matching');
});

test('modified archive bytes and escaping/mismatched manifests are rejected without losing logs', async () => {
  const project = await fixture(), result = await runTest(project, project.tests[0], backend());
  const saved = await loadRecordedInputs(result), file = saved.project.sources[0];
  await chmod(file, 0o666); await writeFile(file, '// archive modified');
  await assert.rejects(loadRecordedInputs(result), /modified/);
  assert.equal((await compareResultInputs(result, project)).state, 'unavailable');
  assert.equal((await readHistory(project.root)).length, 1);
  const second = await runTest(project, project.tests[0], backend());
  const manifestFile = path.join(second.directory, 'input-snapshot.json');
  const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
  manifest.mappings[0].relative = '..'+path.sep+'outside.sv';
  await writeFile(manifestFile, JSON.stringify(manifest));
  await assert.rejects(loadRecordedInputs(second), /mapping/);
  const wrong = { ...second, runId: '00000000-0000-4000-8000-000000000000' };
  await assert.rejects(loadRecordedInputs(wrong), /context mismatch/);
  const third = await runTest(project, project.tests[0], backend());
  await writeFile(path.join(third.directory, 'inputs', 'unrecorded.sv'), 'module extra; endmodule');
  await assert.rejects(loadRecordedInputs(third), /Unrecorded snapshot file/);
  await writeFile(path.join(third.directory, 'result.json'), JSON.stringify({ ...third, inputSnapshot: { version: 99, state: 'ready' } }));
  const rows = await readHistory(project.root);
  assert.equal(rows.length, 3);
  assert.equal(rows.find(row => row.runId === third.runId)?.inputSnapshot?.state, 'unavailable');
});

test('unsupported snapshots fall back explicitly; no snapshot is attributed to current-source builds', async () => {
  const project = await fixture(), target = project.tests[0];
  const include = path.join(project.root,'include'); await mkdir(include);
  const external = project.root + '-external'; await mkdir(external);
  for (const current of [{ ...project, includeDirs: [external] }]) {
    const result = await runTest(current, target, backend(async request => { assert.equal(request.project.root, project.root); }));
    assert.equal(result.status, 'passed'); assert.equal(result.inputSnapshot?.state, 'unavailable');
    await assert.rejects(loadRecordedInputs(result));
  }
  await writeFile(project.sources[0], '`include `DYNAMIC_HEADER');
  const result = await runTest(project, target, backend());
  assert.equal(result.status, 'passed'); assert.equal(result.inputSnapshot?.state, 'unavailable');
});

test('snapshot changes during compilation invalidate the recorded-input association', async () => {
  const project = await fixture();
  const result = await runTest(project, project.tests[0], backend(async request => {
    await chmod(request.project.sources[0], 0o666); await writeFile(request.project.sources[0], '// damaged during build');
  }));
  assert.equal(result.status, 'passed'); assert.equal(result.inputSnapshot?.state, 'unavailable');
  assert.equal((await compareResultInputs(result, project)).state, 'unavailable');
});


test('package order is recomputed from retained bytes rather than the original preflight graph', async () => {
  const project = await fixture(), target = project.tests[0];
  const a = path.join(project.root, 'rtl/a_pkg.sv'), b = path.join(project.root, 'rtl/b_pkg.sv');
  await writeFile(a, 'package a; endpackage'); await writeFile(b, 'package b; import a::*; endpackage');
  const current = { ...project, sources: [b, a, ...project.sources], packageSources: [b, a], packageOrder: 'auto' as const };
  let calls = 0;
  const provider: PackageDependencyProvider = { dependencies: async context => {
    const copied = context.root !== project.root;
    const [bb, aa] = context.packageSources!;
    calls++;
    if (!copied) {
      // Simulate an edit after original analysis but before byte capture.
      await writeFile(a, 'package a; import b::*; endpackage'); await writeFile(b, 'package b; endpackage');
    } else {
      assert.match(await readFile(aa, 'utf8'), /import b/);
      await writeFile(a, 'invalid original package after capture');
    }
    return { declarations: [{ name: 'a', file: aa, offset: 0 }, { name: 'b', file: bb, offset: 0 }],
      references: [{ name: copied ? 'b' : 'a', file: copied ? aa : bb, offset: 12, explicit: true }] };
  } };
  const result = await runTest(current, target, backend(async request => {
    assert.deepEqual(request.project.sources.slice(0,2).map(file => path.basename(file)), ['b_pkg.sv','a_pkg.sv']);
    assert.equal(request.project.packageOrder, 'manifest');
    assert.match(await readFile(request.project.sources[1], 'utf8'), /import b/);
  }), { packageProvider: provider });
  assert.equal(calls, 2); assert.equal(result.status, 'passed', result.message); assert.equal(result.inputSnapshot?.state, 'ready');
  assert.deepEqual(result.sources?.slice(0,2).map(file => path.basename(file)), ['b_pkg.sv','a_pkg.sv']);
  const saved = await loadRecordedInputs(result);
  assert.deepEqual(saved.project.packageSources?.map(file => path.basename(file)), ['b_pkg.sv','a_pkg.sv']);
  assert.equal((await compareResultInputs(result, current)).state, 'changed');
  await writeFile(a, 'package a; import b::*; endpackage');
  const stable: PackageDependencyProvider = { dependencies: async context => ({
    declarations: [{ name:'a',file:context.packageSources![1],offset:0 }, { name:'b',file:context.packageSources![0],offset:0 }],
    references: [{ name:'b',file:context.packageSources![1],offset:12,explicit:true }] }) };
  assert.equal((await compareResultInputs(result, await prepareProject(current, stable))).state, 'matching');
  const packageCopy = saved.project.packageSources![0]; await chmod(packageCopy, 0o666); await writeFile(packageCopy, 'damaged');
  await assert.rejects(loadRecordedInputs(result), /modified/);
});

test('failed or cancelled copied package analysis cannot silently build original sources', async () => {
  const project = await fixture(), current = { ...project, packageSources: [project.sources[0]], packageOrder: 'auto' as const };
  for (const cancel of [false, true]) {
    let builds = 0; const controller = new AbortController();
    const provider: PackageDependencyProvider = { dependencies: async context => {
      if (context.root !== project.root) { if (cancel) controller.abort(); throw Error('copied package analysis failed'); }
      return { declarations: [], references: [] };
    } };
    const result = await runTest(current, current.tests[0], backend(async () => { builds++; }), { packageProvider: provider, signal: controller.signal });
    assert.equal(result.status, cancel ? 'cancelled' : 'failed'); assert.equal(builds, 0);
    assert.notEqual(result.inputSnapshot?.state, 'ready'); await assert.rejects(loadRecordedInputs(result));
  }
});

test('explicit manifest package order is retained without a semantic dependency provider', async () => {
  const project = await fixture(), current = { ...project, packageSources: [project.sources[0]], packageOrder: 'manifest' as const };
  const result = await runTest(current, current.tests[0], backend());
  assert.equal(result.status, 'passed'); assert.equal(result.inputSnapshot?.state, 'ready');
  const saved = await loadRecordedInputs(result);
  assert.deepEqual(saved.project.packageSources, saved.project.sources.slice(0,1));
  assert.equal((await compareResultInputs(result, current)).state, 'matching');
});


test('mixed-case Windows source names preserve the original result mapping', async () => {
  const project = await fixture(), file = path.join(project.root, 'rtl/MixedCase.sv');
  await writeFile(file, 'module MixedCase; endmodule');
  const current = { ...project, sources: [file], packageSources: [file], packageOrder: 'manifest' as const };
  const result = await runTest(current, current.tests[0], backend());
  assert.equal(result.status, 'passed', result.message); assert.equal(result.inputSnapshot?.state, 'ready');
  assert.ok(result.sources?.every(source => typeof source === 'string'));
  assert.equal(path.basename(result.sources![0]).toLowerCase(), 'mixedcase.sv');
  assert.equal((await compareResultInputs(result, current)).state, 'matching');
});
