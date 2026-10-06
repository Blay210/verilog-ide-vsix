import * as vscode from 'vscode';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

export async function testWaveform(file?: string): Promise<void> {
  const isRun = !!file;
  if (!file) {
    const root = vscode.workspace.workspaceFolders![0].uri.fsPath; await mkdir(path.join(root, '.rtl'), { recursive: true });
    file = path.join(root, '.rtl', '파형 preview.vcd');
    await writeFile(file, '$timescale 1ns $end\n$scope module top $end\n$var wire 1 ! clk $end\n$var wire 8 # count [7:0] $end\n$upscope $end\n$enddefinitions $end\n#0 0! b0 #\n#5 1! b1 #\n#10 0! b10 #\n#20');
  }
  await vscode.commands.executeCommand('rtl.openWaveform', file);
  const state = await vscode.commands.executeCommand<any[]>('rtl.getWaveformState');
  const document = state?.find(d => d.file === file);
  assert.ok(document?.metadata?.signals.length >= 2, 'Native reader must parse the VCD in the actual host');
  assert.ok(BigInt(document.metadata.end) > 0n);
  if (isRun) assert.ok(document.test?.key?.startsWith('waveViews.v1.'), 'Actual simulation result must bind to its test presets');
  else assert.equal(document.test, undefined, 'Standalone VCD must not inherit a test preset');
  const tab = vscode.window.tabGroups.all.flatMap(g => g.tabs).find(t => t.input instanceof vscode.TabInputCustom && t.input.viewType === 'rtl.waveform');
  assert.ok(tab, 'VCD must open as a built-in custom editor');
  await vscode.window.tabGroups.close(tab);
  for (let i = 0; i < 20; i++) {
    if (!(await vscode.commands.executeCommand<any[]>('rtl.getWaveformState'))?.some(d => d.file === file)) break;
    await new Promise(r => setTimeout(r, 50));
  }
  assert.ok(!(await vscode.commands.executeCommand<any[]>('rtl.getWaveformState'))?.some(d => d.file === file), 'Closing the editor must dispose its reader');
  console.log('RTL_WAVEFORM_TEST_PASS: native VCD custom editor / metadata / disposal');
}
