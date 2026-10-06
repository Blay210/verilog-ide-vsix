import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, mkdtemp, readFile, writeFile, readdir } from 'node:fs/promises';
import { createProject, loadProject, orderPackages, prepareProject, selectTests, runTests, readHistory, type Project, type SimulatorBackend, type PackageGraph } from '@rtl-dev/core';

async function fixture() {
  const base = path.resolve('.dev/tests'); await mkdir(base, { recursive: true });
  const root = await mkdtemp(path.join(base, 'growth-')); await createProject(root, true);
  return loadProject(root);
}
test('manifest validates concurrency and tags; filters intersect tags', async () => {
  const project = await fixture(), file = path.join(project.root, 'rtl.toml');
  // Use a standalone manifest so example tag defaults cannot affect the fixture.
  await writeFile(file, 'version=1\n[project]\nname="tags"\n[sources]\nrtl=[]\n[simulation]\njobs=2\n[[test]]\nname="a"\ntop="a"\nsources=["tb/counter_basic_tb.sv"]\ntags=["smoke","fast","fast"]\n[[test]]\nname="b"\ntop="b"\nsources=["tb/counter_reset_tb.sv"]\ntags=["smoke"]\n');
  const loaded = await loadProject(project.root);
  assert.equal(loaded.jobs, 2); assert.deepEqual(loaded.tests[0].tags, ['smoke', 'fast']);
  assert.deepEqual(selectTests(loaded, { tags: ['fast', 'smoke'] }).map(t => t.name), ['a']);
  assert.equal(selectTests(loaded, { tags: ['smoke'] }).length, 2);
  assert.throws(() => selectTests(loaded, { tags: ['missing'] }), /No tests/);
  const valid = await readFile(file, 'utf8');
  for (const bad of [valid.replace('jobs=2', 'jobs=5'), valid.replace('"fast"', '"bad tag"')]) {
    await writeFile(file, bad); await assert.rejects(loadProject(project.root));
  }
});
test('stable package graph order, errors and explicit manifest escape hatch', async () => {
  const base = await fixture(), files = ['a.sv', 'b.sv', 'c.sv', 'd.sv'].map(f => path.join(base.root, f));
  const project: Project = { ...base, packageSources: files, sources: [...files, ...base.sources], packageOrder: 'auto' };
  const graph: PackageGraph = { declarations: files.map((file, i) => ({ name: String(i), file, offset: 1 })), references: [{ name: '2', file: files[0], offset: 2, explicit: true }, { name: '1', file: files[2], offset: 2, explicit: false }] };
  assert.deepEqual(orderPackages(project, graph).sources, [files[1], files[2], files[0], files[3], ...base.sources]);
  await assert.rejects(prepareProject(project), /needs slang/);
  assert.equal(await prepareProject({ ...project, packageOrder: 'manifest' }).then(p => p.sources), project.sources);
  assert.throws(() => orderPackages(project, { ...graph, declarations: [...graph.declarations, graph.declarations[0]] }), /Duplicate/);
  assert.throws(() => orderPackages(project, { ...graph, references: [...graph.references, { name: '0', file: files[1], offset: 2, explicit: true }] }), /cycle/);
  assert.throws(() => orderPackages(project, { ...graph, references: [{ name: 'unknown', file: files[0], offset: 2, explicit: true }] }), /Unknown package/);
  assert.throws(() => orderPackages(project, { ...graph, references: [{ name: '0', file: files[0], offset: 0, explicit: true }] }), /inside/);
});
test('bounded concurrent tests isolate logs, persist history and return selection order', async () => {
  const project = await fixture();
  const targets = ['slow', 'fast', 'last'].map(name => ({ ...project.tests[0], name, tags: ['smoke'] }));
  let active = 0, peak = 0;
  let release!: () => void; const barrier = new Promise<void>(resolve => release = resolve);
  const finished: string[] = [];
  const backend: SimulatorBackend = {
    id: 'verilator', capabilities: { waveforms: ['vcd'], timing: true }, check: async () => {},
    build: async request => { active++; peak = Math.max(peak, active); if (active === 2) release(); await barrier; return { executable: request.target.name, cwd: request.directory }; },
    run: async (artifact, ctx) => { if (artifact.executable === 'slow') await new Promise(r => setTimeout(r, 40)); ctx?.onLog?.(`only-${artifact.executable}\n`); active--; }
  };
  const results = await runTests(project, targets, backend, { jobs: 2, onResult: r => finished.push(r.name) });
  assert.equal(peak, 2); assert.equal(active, 0); assert.equal(finished[0], 'fast');
  assert.deepEqual(results.map(r => r.name), targets.map(t => t.name));
  assert.equal(new Set(results.map(r => r.directory)).size, 3);
  for (const result of results) { assert.match(await readFile(result.log, 'utf8'), new RegExp(`only-${result.name}`)); assert.deepEqual(result.tags, ['smoke']); }
  const history = await readHistory(project.root);
  assert.equal(history.length, 3); assert.equal((await readHistory(project.root, 1)).length, 1);
  assert.deepEqual(new Set(history.map(r => r.directory)), new Set(results.map(r => r.directory)));
  const bad = path.join(project.root, '.rtl/runs/damaged'); await mkdir(bad); await writeFile(path.join(bad, 'result.json'), '{');
  const unsafe = { ...results[0], directory: bad, log: path.join(project.root, 'rtl.toml') }; await writeFile(path.join(bad, 'result.json'), JSON.stringify(unsafe));
  assert.equal((await readHistory(project.root)).length, 3);
  const old = { ...results[0] }; delete old.startedAt; await writeFile(path.join(old.directory, 'result.json'), JSON.stringify(old));
  assert.ok((await readHistory(project.root)).every(r => r.startedAt));
  assert.deepEqual((await readdir(project.root)).sort(), ['.gitignore', '.rtl', 'README.md', 'rtl', 'rtl.toml', 'tb']);
  await assert.rejects(runTests(project, targets, backend, { jobs: 5 }), /1..4/);
});
test('cancellation awaits running workers and leaves queued tests unstarted', async () => {
  const project = await fixture(), abort = new AbortController();
  let active = 0, cleaned = 0;
  const targets = ['a', 'b', 'queued'].map(name => ({ ...project.tests[0], name }));
  const backend: SimulatorBackend = {
    id: 'verilator', capabilities: { waveforms: ['vcd'], timing: true }, check: async () => {},
    build: async request => ({ executable: request.target.name, cwd: request.directory }),
    run: async (_, ctx) => { await new Promise<void>(resolve => { ctx!.signal!.addEventListener('abort', () => { setTimeout(() => { cleaned++; resolve(); }, 20); }, { once: true }); if (++active === 2) abort.abort(); }); }
  };
  const results = await runTests(project, targets, backend, { jobs: 2, signal: abort.signal });
  assert.equal(cleaned, 2); assert.deepEqual(results.map(r => r.status), ['cancelled', 'cancelled']);
  assert.equal((await readHistory(project.root)).length, 2);
  assert.deepEqual(await runTests(project, targets, backend, { signal: abort.signal }), []);
});
test('ordinary failures continue the queue; callback errors drain active workers', async () => {
  const project = await fixture();
  const backend: SimulatorBackend = {
    id: 'verilator', capabilities: { waveforms: ['vcd'], timing: true }, check: async () => {},
    build: async request => ({ executable: request.target.name, cwd: request.directory }),
    run: async artifact => { if (artifact.executable === project.tests[0].name) throw Error('assertion'); }
  };
  assert.deepEqual((await runTests(project, project.tests, backend)).map(r => r.status), ['failed', 'passed']);
  let release!: () => void, cleaned = false;
  const running = new Promise<void>(resolve => release = resolve);
  backend.run = async (artifact, ctx) => {
    if (artifact.executable === project.tests[0].name) await running;
    else await new Promise<void>(resolve => {
      ctx!.signal!.addEventListener('abort', () => { setTimeout(() => { cleaned = true; resolve(); }, 20); }, { once: true }); release();
    });
  };
  await assert.rejects(runTests(project, project.tests, backend, { jobs: 2, onResult: r => { if (r.name === project.tests[0].name) throw Error('UI callback failed'); } }), /UI callback failed/);
  assert.equal(cleaned, true);
});
