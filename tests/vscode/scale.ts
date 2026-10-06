import * as vscode from 'vscode';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { performance, monitorEventLoopDelay } from 'node:perf_hooks';

/** Actual editor/document lifecycle, not physical canvas acceptance. */
export async function testMediumWaveform(): Promise<void> {
  const root = vscode.workspace.workspaceFolders![0].uri.fsPath;
  const repository = path.resolve(vscode.extensions.getExtension('rtl-dev-local.rtl-dev')!.extensionPath, '../..');
  const baseline = JSON.parse(await readFile(path.join(repository, '.dev/waveform-scale-latest.json'), 'utf8'));
  const bytes = await readFile(path.join(baseline.root, 'signals-4096-steps-192.vcd'));
  const sha = createHash('sha256').update(bytes).digest('hex');
  await mkdir(path.join(root, '.rtl'), { recursive: true });
  const file = path.join(root, '.rtl/medium-wave.vcd'); await writeFile(file, bytes);
  const states = () => vscode.commands.executeCommand<any[]>('rtl.getWaveformState');
  const waitFor = async (predicate: () => Promise<boolean>) => {
    for (let i = 0; i < 200; i++) { if (await predicate()) return; await new Promise(resolve => setTimeout(resolve, 50)); }
    assert.fail('Medium waveform host state timed out');
  };
  const delay = monitorEventLoopDelay({ resolution: 10 }); delay.enable();
  const cycles: any[] = []; const initialMemory = process.memoryUsage();
  try {
    for (let index = 0; index < 3; index++) {
      const start = performance.now(); await vscode.commands.executeCommand('rtl.openWaveform', file);
      await waitFor(async () => !!(await states())?.find(d => d.file === file)?.metadata);
      const document = (await states())!.find(d => d.file === file);
      assert.equal(document.metadata.signals.length, 4096); assert.equal(document.metadata.changes, 786432);
      assert.equal(document.metadata.end, '9007199254741184');
      assert.equal(document.link.state, 'unavailable', 'A standalone file must not invent recorded-run association');
      const openMs = performance.now() - start;
      const tab = vscode.window.tabGroups.all.flatMap(g => g.tabs).find(t => t.input instanceof vscode.TabInputCustom && t.input.uri.fsPath === file);
      assert.ok(tab); assert.equal(await vscode.window.tabGroups.close(tab), true);
      await waitFor(async () => !(await states())!.some(d => d.file === file));
      cycles.push({ index, openMs, afterCloseMemory: process.memoryUsage() });
    }
    assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'), sha);
    await writeFile(path.join(root, '.rtl/extension-test.json'), JSON.stringify({ passed: true, synthetic: true, mediumWaveform: true, cycles,
      initialMemory, hostEventLoopMaxMs: delay.max / 1e6, sourceHashPreserved: true, notes: ['Extension-host RSS only; no forced GC. Editor closure removes the custom document. This is not physical zoom/search/pan/canvas validation.'] }, null, 2));
    console.log('RTL_MEDIUM_WAVEFORM_PASS: 4096 signals / three actual editor open-close cycles / original hash unchanged');
  } finally { delay.disable(); }
}
