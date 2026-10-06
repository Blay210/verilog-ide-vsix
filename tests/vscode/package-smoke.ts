import * as vscode from 'vscode';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { testEditor } from './editor';
import { testSemantic } from './semantic';
import { readHistory } from '@rtl-dev/core';

export async function run(): Promise<void> {
  const extension = vscode.extensions.getExtension('rtl-dev-local.rtl-dev');
  assert.ok(extension); assert.equal(extension.packageJSON.version, '0.3.1');
  assert.ok(extension.extensionPath.includes('package-tests'), 'Must load the VSIX installation, not repository sources');
  await extension.activate();
  await testEditor(); await testSemantic();
  const root = vscode.workspace.workspaceFolders![0].uri.fsPath;
  await vscode.commands.executeCommand('rtl.refresh');
  await vscode.commands.executeCommand('rtl.runAll');
  const results = await readHistory(root);
  assert.equal(results.length, 2); assert.ok(results.every(result => result.status === 'passed'), JSON.stringify(results));
  const waveform = results[0].waveform!;
  await vscode.commands.executeCommand('rtl.showRecordedStructure', results[0]);
  const structure = await vscode.commands.executeCommand<any>('rtl.getStructure');
  assert.equal(structure.trace.state, 'ready');
  await vscode.commands.executeCommand('rtl.openWaveform', waveform);
  let state: any;
  for (let attempt = 0; attempt < 100; attempt++) {
    state = (await vscode.commands.executeCommand<any[]>('rtl.getWaveformState'))?.find(document => document.file === waveform);
    if (state?.metadata && state.link.state === 'ready') break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(state?.metadata.signals.length); assert.equal(state.link.state, 'ready');
  const tab = vscode.window.tabGroups.all.flatMap(group => group.tabs).find(tab => tab.input instanceof vscode.TabInputCustom && tab.input.uri.fsPath === waveform);
  if (tab) await vscode.window.tabGroups.close(tab);
  // Verify that the analysis helper and server are actually included in the install.
  for (const file of ['dist/analyze.py', 'dist/server.cjs', 'dist/waveform-worker.cjs', 'dist/waveform.js', 'dist/waveform.css']) assert.ok((await readFile(path.join(extension.extensionPath, file))).length);
  await writeFile(path.join(root, '.rtl/package-test.json'), JSON.stringify({ passed: true, version: extension.packageJSON.version, installedPath: extension.extensionPath, editor: true, semantic: true, simulation: results.map(result => ({ name: result.name, status: result.status })), waveform: true, recordedStructure: true }, null, 2));
  console.log('RTL_INSTALLED_PACKAGE_PASS: editor / semantic / two simulations / waveform / recorded structure');
}
