import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, mkdtemp, writeFile, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { loadProject, captureInputs } from '@rtl-dev/core';
import { SlangProvider } from '@rtl-dev/semantic';

/** Actual compiler/provider baseline with generated sources, not a user RTL design. */
test('native medium project: 256 RTL files, hierarchy, unsaved widths and unchanged saved inputs',
  { skip: !process.env.RTL_SEMANTIC_PYTHON, timeout: 90000 }, async () => {
    const base = path.resolve('.dev/scale-tests'); await mkdir(base, { recursive: true });
    const root = await mkdtemp(path.join(base, 'semantic-한글 ')), rtl = path.join(root, 'rtl'); await mkdir(rtl);
    const count = 256;
    const definitions = Array.from({ length: count }, (_, i) => `module unit_${i} #(parameter W=${8 + i % 4 * 8})(input logic [W-1:0] a, output wire [W-1:0] y); assign y=a; endmodule\n`);
    await Promise.all(definitions.map((text, i) => writeFile(path.join(rtl, `unit_${String(i).padStart(3, '0')}.sv`), text)));
    const top = 'module top; logic [31:0] bus;\n' + definitions.map((_, i) => `unit_${i} u_${i}(.a(bus[${7 + i % 4 * 8}:0]),.y());`).join('\n') + '\nendmodule\n';
    const topFile = path.join(root, 'top.sv'); await writeFile(topFile, top);
    await writeFile(path.join(root, 'rtl.toml'), 'version=1\n[project]\nname="medium-baseline"\n[sources]\nrtl=["rtl/*.sv"]\n[[test]]\nname="medium"\ntop="top"\nsources=["top.sv"]\n');
    const project = await loadProject(root), cache = path.join(root, '.rtl/semantic-cache');
    const provider = new SlangProvider(process.env.RTL_SEMANTIC_PYTHON!, path.resolve('packages/semantic/python/analyze.py'), cache);
    const before = await captureInputs(project, project.tests[0]); assert.equal(before.state, 'observed-stable');
    const start = performance.now(), design = await provider.hierarchy(project, 'medium', []);
    const hierarchyMs = performance.now() - start;
    assert.equal(design.diagnostics.filter(d => d.severity === 'error').length, 0, JSON.stringify(design.diagnostics));
    assert.equal(design.roots.length, 1); assert.equal(design.roots[0].children.length, count);
    assert.equal(design.roots[0].children.find(n => n.name === 'u_255')!.ports[0].signalType?.width, 32);
    const last = path.join(rtl, 'unit_255.sv'), original = await readFile(last, 'utf8');
    const overlay = original.replace('parameter W=32', 'parameter W=16'), overlayStart = performance.now();
    const unsaved = await provider.hierarchy(project, 'medium', [{ file: last, text: overlay }]);
    const overlayMs = performance.now() - overlayStart;
    assert.equal(unsaved.diagnostics.filter(d => d.severity === 'error').length, 0);
    assert.equal(unsaved.roots[0].children.find(n => n.name === 'u_255')!.ports[0].signalType?.width, 16);
    assert.equal(await readFile(last, 'utf8'), original, 'Overlay must not overwrite saved RTL');
    const after = await captureInputs(project, project.tests[0]); assert.equal(after.fingerprint, before.fingerprint);
    assert.deepEqual(await readdir(cache), [], 'Semantic scratch jobs must be cleaned up');
    const cancel = new AbortController(); cancel.abort();
    await assert.rejects(provider.hierarchy(project, 'medium', [], cancel.signal));
    const activeCancel = new AbortController();
    let settled = false;
    const active = provider.hierarchy(project, 'medium', [], activeCancel.signal);
    active.then(() => { settled = true; }, () => { settled = true; });
    const cancelled = assert.rejects(active);
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(settled, false, 'Cancellation must target an outstanding semantic job');
    const cancelStart = performance.now(); activeCancel.abort(); await cancelled;
    const cancellationMs = performance.now() - cancelStart;
    assert.deepEqual(await readdir(cache), [], 'Cancelled semantic scratch job must be removed');
    const retryStart = performance.now(), restored = await provider.hierarchy(project, 'medium', []);
    const retryMs = performance.now() - retryStart;
    assert.equal(restored.roots[0].children.find(n => n.name === 'u_255')!.ports[0].signalType?.width, 32);
    const finalInputs = await captureInputs(project, project.tests[0]);
    assert.equal(finalInputs.fingerprint, before.fingerprint, 'Cancellation and retry must preserve saved inputs');
    const report = { passedCorrectness: true, synthetic: true, root, rtlFiles: count, totalSourceFiles: count + 1, instances: count + 1,
      hierarchyMs, unsavedHierarchyMs: overlayMs, cancellationMs, cancelledPendingJob: true, retryMs, inputFingerprintPreserved: finalInputs.fingerprint === before.fingerprint,
      lastSourceHash: createHash('sha256').update(original).digest('hex'), cacheClean: (await readdir(cache)).length === 0, node: process.version };
    await writeFile('.dev/semantic-scale-latest.json', JSON.stringify(report, null, 2));
    console.log('SEMANTIC_SCALE_BASELINE:', JSON.stringify(report));
  });
