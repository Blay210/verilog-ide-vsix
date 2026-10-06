import * as vscode from 'vscode';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { loadProject } from '@rtl-dev/core';
import { testEditor } from './editor';
import { testEditorProfile } from './editor-profile';
import { testPhysicalWaveformCancel } from './waveform-physical-cancel';
import { testSemantic } from './semantic';
import { testStructure } from './structure';
import { testWaveform } from './waveform';
import { testToolPaths } from './tool-paths';
import { testRecordedSources } from './recorded';
import { testMediumWaveform } from './scale';
import { testManualInput } from './manual';
import { testFreshness } from './freshness';
import { testWaveformLifecycle } from './waveform-lifecycle';
import { testWaveformRenderStress } from './waveform-render-stress';

export async function run(): Promise<void> {
  const extension = vscode.extensions.getExtension('rtl-dev-local.rtl-dev');
  assert.ok(extension, 'RTL Dev extension was not loaded');
  await extension.activate();
  if (process.env.RTL_WAVEFORM_PHYSICAL_CANCEL === '1') { await testPhysicalWaveformCancel(); return; }
  if (process.env.RTL_EDITOR_PROFILE_TEST === '1') { await testEditorProfile(); return; }
  if (process.env.RTL_MANUAL_ACCEPTANCE === '1') { await testManualInput(); return; }
  if (process.env.RTL_WAVEFORM_RENDER_TEST === 'stress') { await testWaveformRenderStress(); return; }
  if (process.env.RTL_WAVEFORM_RENDER_TEST === '1') { await testWaveformLifecycle(true, true); return; }
  if (process.env.RTL_WAVEFORM_PROFILE_TEST === '1') { await testWaveformLifecycle(true); return; }
  if (process.env.RTL_WAVEFORM_LIFECYCLE_TEST === '1') { await testWaveformLifecycle(); return; }
  if (process.env.RTL_FRESHNESS_TEST === '1') { await testFreshness(); return; }
  if (process.env.RTL_MEDIUM_WAVEFORM_TEST === '1') { await testMediumWaveform(); return; }
  if (process.env.RTL_TOOLPATH_TEST === '1') { await testToolPaths(); return; }
  if (process.env.RTL_RECORDED_TEST === '1') { await testRecordedSources(); return; }
  const registered = await vscode.commands.getCommands(true);
  for (const command of ['rtl.runSelected', 'rtl.runAll', 'rtl.runCurrent', 'rtl.stopSimulation', 'rtl.toolchain', 'rtl.openWaveform', 'rtl.resultLog', 'rtl.resultWaveform', 'rtl.resultRerun']) {
    assert.ok(registered.includes(command), `Visible RTL action must be registered: ${command}`);
  }
  await vscode.commands.executeCommand('rtl.start.focus');
  await vscode.commands.executeCommand('rtl.stopSimulation'); // Idle stop must be harmless.
  console.log('RTL_START_TEST_PASS: start view / visible action registration / idle stop');
  await vscode.commands.executeCommand('rtl.refresh');
  type Status = {phase:string;statuses:string[];selected?:string;active:string[];tests:{id:string;name:string;selected:boolean}[]};
  const status = () => vscode.commands.executeCommand<Status>('rtl.getSimulationStatus');
  const ready = await status(); assert.equal(ready.tests.length, 2);
  const basic = ready.tests.find(t=>t.name === 'counter_basic')!;
  await vscode.commands.executeCommand('rtl.selectTarget',basic.id);
  const selected = await status(); assert.ok(selected.tests.find(t=>t.id === basic.id)?.selected);
  assert.ok(selected.selected?.includes('counter_basic'));
  assert.equal(selected.phase,'ready');
  console.log('RTL_SIMULATION_SELECTION_PASS: explicit target / no automatic execution');
  await testEditor();
  if (process.env.RTL_SEMANTIC_TEST === '1') { await testSemantic(); await testStructure(); }
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const root = folder.uri.fsPath;
  await testWaveform();
  if (process.env.RTL_EDITOR_ONLY === '1') {
    await mkdir(path.join(root, '.rtl'), { recursive: true });
    await writeFile(path.join(root, '.rtl', 'extension-test.json'), JSON.stringify({ passed: true, editor: true }));
    return;
  }
  async function results() {
    const directory = path.join(root, '.rtl/runs');
    let names: string[];
    try { names = await readdir(directory); } catch { return []; }
    return Promise.all(names.map(async name => JSON.parse(await readFile(path.join(directory, name, 'result.json'), 'utf8'))));
  }
  const manifest = path.join(root, 'rtl.toml');
  await writeFile(path.join(root, 'rtl/base_pkg.sv'), 'package base_pkg; timeunit 1ns; timeprecision 1ps; localparam int WIDTH=8; endpackage\n');
  await writeFile(path.join(root, 'rtl/count_pkg.sv'), 'package count_pkg; timeunit 1ns; timeprecision 1ps; typedef logic [base_pkg::WIDTH-1:0] count_t; endpackage\n');
  const dut = path.join(root, 'rtl/counter.sv');
  await writeFile(dut, (await readFile(dut, 'utf8')).replace('logic [7:0] count', 'count_pkg::count_t count'));
  await writeFile(manifest, (await readFile(manifest, 'utf8')).replace('timing = true', 'timing = true\njobs = 2').replace('[sources]', '[sources]\npackages = ["rtl/count_pkg.sv", "rtl/base_pkg.sv"]'));
  await vscode.commands.executeCommand('rtl.refresh');
  await vscode.commands.executeCommand('rtl.runAll');
  assert.deepEqual((await status()).statuses, ['passed','passed']); assert.equal((await status()).phase,'completed');
  let found = await results();
  assert.equal(found.length, 2, 'Run All must create exactly two results');
  assert.ok(found.every(r => r.status === 'passed'), JSON.stringify(found));
  assert.ok(found.every(r => r.waveform?.endsWith('.vcd')));
  assert.ok(found.every(r => r.runId && r.inputIdentity?.state === 'observed-stable'));
  const versionCheck = await vscode.commands.executeCommand<any>('rtl.resultActions', { result: found[0], project: await loadProject(root) }, 'Check Source Version');
  assert.equal(versionCheck.state, 'matching');
  const savedDut = await readFile(dut, 'utf8');
  try {
    await writeFile(dut, savedDut + '\n// changed saved input\n');
    const changed = await vscode.commands.executeCommand<any>('rtl.resultActions', { result: found[0], project: await loadProject(root) }, 'Check Source Version');
    assert.equal(changed.state, 'changed');
  } finally { await writeFile(dut, savedDut); }
  console.log('RTL_INPUT_IDENTITY_PASS: persisted run ID / matching saved inputs / changed sources');
  await vscode.commands.executeCommand('rtl.showRecordedStructure', found[0]);
  const recordedDesign = await vscode.commands.executeCommand<any>('rtl.getStructure');
  assert.equal(recordedDesign.stale, false); assert.ok(recordedDesign.design.roots.length);
  assert.equal(recordedDesign.trace.state, 'ready', 'A passing package fixture must also support recorded semantic structure');
  await vscode.commands.executeCommand('rtl.showStructure', 'counter_basic');
  await testWaveform(found[0].waveform);
  assert.ok(found.every(r => r.sources[0].endsWith('base_pkg.sv') && r.sources[1].endsWith('count_pkg.sv')), 'GUI must use automatic package preparation');
  await vscode.window.showTextDocument(vscode.Uri.joinPath(folder.uri, 'tb/counter_reset_tb.sv'));
  await vscode.commands.executeCommand('rtl.runCurrent');
  found = await results();
  assert.equal(found.length, 3, 'Run Current must run only the selected source test');
  assert.equal(found.filter(r => r.name === 'counter_reset').length, 2);
  assert.ok(found.every(r => r.status === 'passed'));
  await vscode.commands.executeCommand('rtl.runTag', 'basic');
  found = await results();
  assert.equal(found.length, 4, 'Run Tag must select only basic');
  assert.equal(found.filter(r => r.name === 'counter_basic').length, 2);
  assert.ok(found.every(r => r.status === 'passed'));
  const history = await vscode.commands.executeCommand<any[]>('rtl.getHistory');
  assert.equal(history?.length, 4);
  await vscode.commands.executeCommand('rtl.refresh');
  const restored = await vscode.commands.executeCommand<any[]>('rtl.getHistory');
  assert.deepEqual(new Set(restored?.map(r => r.directory)), new Set(found.map(r => r.directory)));
  assert.ok(restored?.every(r => r.startedAt && r.tags.includes('smoke')));
  await vscode.commands.executeCommand('rtl.selectTarget',basic.id);
  await vscode.commands.executeCommand('rtl.runTarget');
  assert.deepEqual((await status()).statuses,['passed']);
  assert.equal((await results()).length,5);
  const basicFile=path.join(root,'tb/counter_basic_tb.sv');
  const originalBasic=await readFile(basicFile,'utf8');
  try {
    await writeFile(basicFile,'module counter_basic_tb; initial $fatal(1, "C3 expected failure"); endmodule');
    await vscode.commands.executeCommand('rtl.runTarget');
    assert.deepEqual((await status()).statuses,['failed']);
    await writeFile(basicFile,'module counter_basic_tb; initial forever #1; endmodule');
    const beforeCancel = new Set(await readdir(path.join(root, '.rtl/runs')));
    const running = vscode.commands.executeCommand('rtl.runTarget');
    const deadline=Date.now()+30000;
    while((await status()).phase !== 'running' && Date.now()<deadline) await new Promise(resolve=>setTimeout(resolve,100));
    assert.equal((await status()).phase,'running');
    assert.ok((await status()).active.some(name=>name.includes('counter_basic')));
    // onStart precedes per-test package preflight. Cancelling there legitimately
    // returns no TestResult; this case intends to exercise simulation cleanup.
    let simulationStarted = false; const executionDeadline = Date.now() + 60000;
    while (!simulationStarted && Date.now() < executionDeadline) {
      for (const name of await readdir(path.join(root, '.rtl/runs'))) {
        if (beforeCancel.has(name)) continue;
        try { simulationStarted ||= /^Running counter_basic\r?$/m.test(await readFile(path.join(root, '.rtl/runs', name, 'run.log'), 'utf8')); } catch { /* Run directory/log may still be preparing. */ }
      }
      if (!simulationStarted) await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(simulationStarted, 'Cancellation fixture must reach native simulation before Stop');
    await vscode.commands.executeCommand('rtl.stopSimulation');
    await running;
    assert.equal((await status()).phase,'cancelled'); assert.deepEqual((await status()).statuses,['cancelled']);
    assert.deepEqual((await status()).active,[]);
  } finally { await writeFile(basicFile,originalBasic); }
  console.log('RTL_SIMULATION_STATUS_PASS: batch / chosen target / failure / running / cancellation / cleanup');
  found=await results();
  await writeFile(path.join(root, '.rtl', 'extension-test.json'), JSON.stringify({ passed: true, runs: found.map(r => ({ name: r.name, status: r.status })) }, null, 2));
  console.log('RTL_EXTENSION_TEST_PASS: Parallel Run All / Run Current / Run Tag / persisted history / waveform results');
}
