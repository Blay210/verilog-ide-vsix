import { parseVcd, mapTracePorts, valueAt, formatValue } from '@rtl-dev/waveform';
import * as vscode from 'vscode';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { loadProject, readHistory, loadRecordedInputs, loadRecordedTrace } from '@rtl-dev/core';

export async function testRecordedSources(): Promise<void> {
  const root = vscode.workspace.workspaceFolders![0].uri.fsPath;
  await vscode.commands.executeCommand('rtl.refresh');
  await vscode.commands.executeCommand('rtl.runAll');
  const results = await readHistory(root);
  assert.equal(results.length, 2); assert.ok(results.every(r => r.status === 'passed' && r.inputSnapshot?.state === 'ready' && r.traceIdentity?.state === 'ready'));
  const result = results.find(r => r.name === 'counter_basic')!, project = await loadProject(root);
  const source = result.source!, original = await readFile(source, 'utf8');
  try {
    await writeFile(source, '// current testbench replaced after the run');
    const uri = await vscode.commands.executeCommand<string>('rtl.resultActions', { result, project }, 'Open Recorded Source');
    const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(uri));
    assert.equal(document.uri.scheme, 'rtl-recorded'); assert.equal(document.getText(), original);
    assert.equal(document.languageId, 'systemverilog');
    await vscode.commands.executeCommand('type', { text: '// rejected' });
    assert.equal(document.getText(), original, 'Normal editor typing must not change recorded source documents.');
    const comparison = await vscode.commands.executeCommand<any>('rtl.resultActions', { result, project }, 'Check Source Version');
    assert.equal(comparison.state, 'changed');
  } finally { await writeFile(source, original); }
  const manifest = path.join(root, 'rtl.toml'), backup = path.join(root, '.rtl/recorded-host-manifest.toml');
  const dut = path.join(root, 'rtl/counter.sv'), originalDut = await readFile(dut, 'utf8');
  const packageFile = project.packageSources?.[0], packageBytes = packageFile ? await readFile(packageFile, 'utf8') : undefined;
  const header = project.includeDirs.length ? path.join(project.includeDirs[0], 'nested/width.svh') : undefined;
  const headerBytes = header ? await readFile(header, 'utf8') : undefined;
  await rename(manifest, backup);
  try {
    await writeFile(dut, 'invalid current DUT source');
    if (packageFile) await writeFile(packageFile, 'invalid current package');
    if (header) await writeFile(header, 'invalid current include');
    await vscode.commands.executeCommand('rtl.resultActions', { result, project }, 'Explore Recorded Structure');
    const state = await vscode.commands.executeCommand<any>('rtl.getStructure');
    assert.equal(state.stale, false); assert.equal(state.context.mode, 'recorded'); assert.equal(state.context.runId, result.runId);
    const trace = await loadRecordedTrace(result), data = parseVcd(trace.bytes.toString('utf8'));
    const bindings = mapTracePorts(state.design, data.signals, result.top);
    assert.equal(bindings.find(binding => binding.port === 'count')?.state, 'matched');
    const child = state.design.roots[0].children.find((node:any) => node.module === 'counter'); assert.ok(child);
    await vscode.commands.executeCommand('rtl.inspectStructure', child.id);
    assert.equal(state.trace.state, 'ready', JSON.stringify(state.trace));
    const tick = String(BigInt(data.end) / 2n);
    await vscode.commands.executeCommand('rtl.setStructureTime', tick);
    const observed = await vscode.commands.executeCommand<any>('rtl.getStructure');
    assert.equal(observed.trace.cursor, tick);
    const count = bindings.find(binding => binding.port === 'count')!;
    assert.ok(Object.values(observed.trace.values).some((v: any) => v.text === formatValue(valueAt(data.channels.get(count.code!)!, BigInt(tick)), 'hex')));
    await vscode.commands.executeCommand('rtl.openWaveform', result.waveform);
    const waitFor = async (check: () => Promise<boolean>) => {
      for (let i = 0; i < 100; i++) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 100)); }
      assert.fail('Timed out waiting for recorded cursor host state');
    };
    await waitFor(async () => (await vscode.commands.executeCommand<any[]>('rtl.getWaveformState'))!.some(w => w.link?.runId === result.runId && w.link.state === 'ready' && w.link.time === tick));
    await vscode.commands.executeCommand('rtl.setWaveformTime', result.waveform, '0');
    await waitFor(async () => (await vscode.commands.executeCommand<any>('rtl.getStructure')).trace.cursor === '0');
    await vscode.commands.executeCommand('rtl.setStructureTime', tick);
    await waitFor(async () => (await vscode.commands.executeCommand<any[]>('rtl.getWaveformState'))!.some(w => w.link?.runId === result.runId && w.link.time === tick));
    // Close the actual custom editor, leaving its linked structure view alive.
    const waveTab = vscode.window.tabGroups.all.flatMap(group => group.tabs).find(tab => tab.input instanceof vscode.TabInputCustom && tab.input.uri.fsPath === result.waveform);
    assert.ok(waveTab, 'Expected a real waveform custom editor tab');
    assert.equal(await vscode.window.tabGroups.close(waveTab), true);
    await waitFor(async () => !(await vscode.commands.executeCommand<any[]>('rtl.getWaveformState'))!.some(w => w.link?.runId === result.runId));
    await vscode.commands.executeCommand('rtl.setStructureTime', '0');
    assert.equal((await vscode.commands.executeCommand<any>('rtl.getStructure')).trace.state, 'ready', 'Closing waveform must keep the structure reader alive');
    await vscode.commands.executeCommand('rtl.openWaveform', result.waveform);
    await waitFor(async () => (await vscode.commands.executeCommand<any[]>('rtl.getWaveformState'))!.some(w => w.link?.runId === result.runId && w.link.state === 'ready' && w.link.time === '0'));
    await vscode.commands.executeCommand('rtl.setStructureTime', tick);
    await waitFor(async () => (await vscode.commands.executeCommand<any[]>('rtl.getWaveformState'))!.some(w => w.link?.runId === result.runId && w.link.time === tick));
    const structureTab = vscode.window.tabGroups.all.flatMap(group => group.tabs).find(tab => tab.input instanceof vscode.TabInputWebview && tab.label.startsWith('Recorded RTL Structure'));
    assert.ok(structureTab, 'Expected a real recorded structure panel');
    assert.equal(await vscode.window.tabGroups.close(structureTab), true);
    await vscode.commands.executeCommand('rtl.setWaveformTime', result.waveform, '0');
    assert.ok((await vscode.commands.executeCommand<any[]>('rtl.getWaveformState'))!.some(w => w.link?.runId === result.runId && w.link.state === 'ready' && w.link.time === '0'), 'Closing structure must keep waveform reader alive');
    await vscode.commands.executeCommand('rtl.showRecordedStructure', result);
    assert.equal((await vscode.commands.executeCommand<any>('rtl.getStructure')).trace.cursor, '0');
    await vscode.commands.executeCommand('rtl.inspectStructure', child.id);
    await vscode.commands.executeCommand('rtl.setStructureTime', tick);
    await waitFor(async () => (await vscode.commands.executeCommand<any[]>('rtl.getWaveformState'))!.some(w => w.link?.runId === result.runId && w.link.time === tick));
    const otherWave = results.find(r => r.runId !== result.runId)!;
    await vscode.commands.executeCommand('rtl.openWaveform', otherWave.waveform);
    await waitFor(async () => (await vscode.commands.executeCommand<any[]>('rtl.getWaveformState'))!.some(w => w.link?.runId === otherWave.runId && w.link.state === 'ready'));
    await vscode.commands.executeCommand('rtl.setWaveformTime', otherWave.waveform, '0');
    assert.equal((await vscode.commands.executeCommand<any>('rtl.getStructure')).trace.cursor, tick, 'Another run must not move this structure cursor');
    const waveBytes = await readFile(result.waveform!);
    try {
      await writeFile(result.waveform!, Buffer.from('damaged recorded trace'));
      await waitFor(async () => (await vscode.commands.executeCommand<any>('rtl.getStructure')).trace.state === 'unavailable');
      assert.equal((await vscode.commands.executeCommand<any>('rtl.getStructure')).stale, false, 'Trace damage must not discard valid retained structure');
      await waitFor(async () => (await vscode.commands.executeCommand<any[]>('rtl.getWaveformState'))!.some(w => w.link?.runId === result.runId && w.link.state === 'unavailable'));
    } finally { await writeFile(result.waveform!, waveBytes); }
    await new Promise(resolve => setTimeout(resolve, 300));
    await vscode.commands.executeCommand('rtl.refreshStructure');
    assert.equal((await vscode.commands.executeCommand<any>('rtl.getStructure')).trace.state, 'ready');
    await vscode.commands.executeCommand('rtl.openStructureDefinition', child.id);
    const opened = vscode.window.activeTextEditor!.document;
    assert.equal(opened.uri.scheme, 'rtl-recorded'); assert.equal(opened.getText(), originalDut);
    if (packageFile) {
      const saved = await loadRecordedInputs(result);
      const copiedPackage = saved.sourceMappings.find(mapping => path.basename(mapping.original) === path.basename(packageFile))!;
      await vscode.commands.executeCommand('rtl.openRecordedSource', result, copiedPackage.recorded);
      assert.equal(vscode.window.activeTextEditor!.document.uri.scheme, 'rtl-recorded');
      assert.equal(vscode.window.activeTextEditor!.document.getText(), packageBytes);
      await vscode.commands.executeCommand('rtl.openStructureDefinition', child.id);
    }
    await vscode.commands.executeCommand('type', { text: '// blocked recorded definition' });
    assert.equal(opened.getText(), originalDut);
    await assert.rejects(Promise.resolve(vscode.commands.executeCommand('rtl.openRecordedSource', result, dut)), /not part/);
    if (header) {
      const saved = await loadRecordedInputs(result), copied = saved.sourceMappings.find(mapping => path.basename(mapping.original) === 'width.svh')!;
      await vscode.commands.executeCommand('rtl.openRecordedSource', result, copied.recorded);
      assert.equal(vscode.window.activeTextEditor!.document.getText(), headerBytes);
      assert.equal(vscode.window.activeTextEditor!.document.languageId, 'systemverilog');
      await vscode.commands.executeCommand('type', { text: '// blocked header' });
      assert.equal(vscode.window.activeTextEditor!.document.getText(), headerBytes);
    }
    await vscode.commands.executeCommand('rtl.refreshStructure');
    assert.equal((await vscode.commands.executeCommand<any>('rtl.getStructure')).context.runId, result.runId);
    const other = results.find(r => r.runId !== result.runId)!;
    await vscode.commands.executeCommand('rtl.showRecordedStructure', other);
    const switched = await vscode.commands.executeCommand<any>('rtl.getStructure');
    assert.equal(switched.context.runId, other.runId); assert.equal(switched.navigation.canBack, false);
    const record = path.join(other.directory, 'input-snapshot.json'), originalRecord = await readFile(record, 'utf8');
    try {
      await writeFile(record, '{}');
      await vscode.commands.executeCommand('rtl.refreshStructure');
      assert.equal((await vscode.commands.executeCommand<any>('rtl.getStructure')).stale, true);
    } finally { await writeFile(record, originalRecord); }
  } finally { await writeFile(dut, originalDut); if (packageFile) await writeFile(packageFile, packageBytes!); if (header) await writeFile(header, headerBytes!); await rename(backup, manifest); }
  // Allow restored source/manifest watcher notifications to settle before a current analysis.
  await new Promise(resolve => setTimeout(resolve, 500));
  await vscode.commands.executeCommand('rtl.showStructure', 'counter_basic');
  assert.equal((await vscode.commands.executeCommand<any>('rtl.getStructure')).context.mode, 'current');
  assert.equal((await vscode.commands.executeCommand<any>('rtl.getStructure')).trace, undefined);
  console.log('RTL_RECORDED_STRUCTURE_PASS: run identity / no current manifest / archived definition / switch / corruption / current mode');
  await writeFile(path.join(root, '.rtl/extension-test.json'), JSON.stringify({ passed: true, recordedSources: true, recordedPackages: !!packageFile, recordedIncludes: !!header, recordedTrace: true, recordedValues: true, sharedCursor: true, peerCloseReopen: true, traceInvalidation: true, runs: results.map(r => ({ name: r.name, status: r.status, inputSnapshot: r.inputSnapshot?.state })) }, null, 2));
  console.log('RTL_RECORDED_SOURCE_PASS: native snapshot builds / changed original / archived text / read-only editor');
}
