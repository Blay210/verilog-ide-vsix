import * as vscode from 'vscode';
import path from 'node:path';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

/** Development-only idle host for physical UI acceptance. Never drives editor input. */
export async function testManualInput(): Promise<void> {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!root) throw new Error('Manual acceptance requires the isolated example workspace');
  const extension = vscode.extensions.getExtension('rtl-dev-local.rtl-dev');
  if (!extension) throw new Error('Development extension not found');
  const fixtures = path.resolve(extension.extensionPath, '../..', '.dev/vscode-tests');
  const relative = path.relative(fixtures, root);
  if (relative.startsWith('..') || path.isAbsolute(relative) || !/^run-[^\\/]+[\\/]project$/.test(relative)) {
    throw new Error('Manual acceptance only writes isolated .dev/vscode-tests/run-*/project fixtures');
  }
  const output = path.join(root, '.rtl');
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, 'manual-stop.json'), '{"finish":false}');
  const source = path.join(root, 'rtl', 'ui-smoke.sv');
  await writeFile(source, '');
  const document = await vscode.workspace.openTextDocument(source);
  const editor = await vscode.window.showTextDocument(document);
  editor.options = { tabSize: 4, insertSpaces: true };
  await vscode.commands.executeCommand('workbench.action.closeSidebar');
  await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  let waveform: string | undefined;
  const dense = process.env.RTL_MANUAL_DENSE === '1';
  if (dense) {
    if (!['1', 'stress'].includes(process.env.RTL_WAVEFORM_RENDER_TEST ?? '')) throw Error('Dense manual observation requires the development render diagnostics flag');
    waveform = path.join(output, 'manual-dense.vcd');
    const lines = ['$timescale 1 ps $end', '$scope module top $end'];
    for (let id = 0; id < 32; id++) lines.push(`$var wire 8 c${id} port_${id} [7:0] $end`);
    lines.push('$upscope $end', '$enddefinitions $end');
    for (let step = 0; step < 4096; step++) {
      lines.push('#' + (9007199254740993n + BigInt(step)));
      for (let id = 0; id < 32; id++) lines.push(`b${id === 0 && step % 17 === 0 ? 'xxxxxxxx' : id === 0 && step % 17 === 1 ? 'zzzzzzzz' : ((id + step) % 256).toString(2).padStart(8, '0')} c${id}`);
    }
    await writeFile(waveform, lines.join('\n'));
  } else if (process.env.RTL_MANUAL_WAVEFORM === '1') {
    await vscode.commands.executeCommand('rtl.refresh');
    await vscode.commands.executeCommand('rtl.runAll');
    const runs = path.join(output, 'runs');
    const results = await Promise.all((await readdir(runs)).map(async id => JSON.parse(await readFile(path.join(runs, id, 'result.json'), 'utf8'))));
    const basic = results.filter(result => result.name === 'counter_basic' && result.status === 'passed').sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)))[0];
    if (!basic?.waveform || !results.some(result => result.name === 'counter_reset' && result.status === 'passed')) throw new Error('Manual waveform preparation requires two passing native examples');
    waveform = basic.waveform;
  }
  const journal: unknown[] = [];
  let previous = '';
  const started = Date.now();
  await writeFile(path.join(output, 'manual-ready.json'), JSON.stringify({ root, source, waveform, started, vscode: vscode.version, language: document.languageId, timeoutMs: 900_000 }));
  console.log('RTL_MANUAL_READY:', root);
  // Write readiness before opening: fixture bookkeeping must not invalidate an open trace.
  if (waveform) await vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(waveform), 'rtl.waveform');
  const hash = async () => waveform ? createHash('sha256').update(await readFile(waveform)).digest('hex') : undefined;
  const initialHash = await hash();
  if (dense) {
    const waitProfile = async (check: (profile: any) => boolean) => {
      const deadline = Date.now() + 20000;
      while (Date.now() < deadline) {
        const profiles = await vscode.commands.executeCommand<any[]>('rtl.getWaveformRenderProfile');
        const profile = profiles?.find(d => d.file === waveform)?.profile;
        if (profile && check(profile)) return profile;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw Error('Dense manual renderer did not become ready');
    };
    await waitProfile(profile => profile.samples?.length > 0);
    await vscode.commands.executeCommand('rtl.probeWaveformRenderer', waveform, '9007199254740994', { parents: 32, expanded: 16, from: '9007199254740993', to: '9007199254745088' });
    const profile = await waitProfile(profile => profile.samples?.some((sample: any) => sample.details?.parentRows === 32 && sample.details?.bitRows?.length === 128));
    await writeFile(path.join(output, 'manual-dense-ready.json'), JSON.stringify({ waveform, initialHash, profile }));
  }
  let previousProfile = '';
  let layoutRevision = 0;
  while (Date.now() - started < 900_000) {
    if (dense) {
      // Bounded fixture preparation only; physical acceptance still uses native input.
      let layout: { revision?: number; layout?: string } | undefined;
      try { layout = JSON.parse(await readFile(path.join(output, 'manual-layout.json'), 'utf8')); } catch { /* Optional fixture request. */ }
      if (layout && Number.isSafeInteger(layout.revision) && layout.revision! > layoutRevision && layout.revision! <= 4
        && ['single', 'dense'].includes(layout.layout ?? '')) {
        layoutRevision = layout.revision!;
        await vscode.commands.executeCommand('rtl.probeWaveformRenderer', waveform, '9007199254744127', {
          parents: layout.layout === 'single' ? 1 : 32, expanded: layout.layout === 'single' ? 0 : 16,
          from: '9007199254740993', to: '9007199254745088'
        });
        await writeFile(path.join(output, 'manual-layout-applied.json'), JSON.stringify({ ...layout, at: Date.now() }));
      }
      const profile = JSON.stringify(await vscode.commands.executeCommand('rtl.getWaveformRenderProfile'));
      if (profile !== previousProfile) {
        previousProfile = profile;
        await writeFile(path.join(output, 'manual-render.json'), profile);
      }
    }
    const active = vscode.window.activeTextEditor;
    const activePath = active && path.relative(root, active.document.uri.fsPath);
    if (active && activePath && !activePath.startsWith('..') && !path.isAbsolute(activePath) && /\.(sv|v|svh|vh)$/i.test(activePath)) {
      const state = { file: activePath, text: active.document.getText(), selection: { start: active.selection.start, end: active.selection.end }, version: active.document.version };
      const encoded = JSON.stringify(state);
      if (encoded !== previous) {
        if (journal.length >= 5000) throw new Error('Manual input observation limit exceeded');
        journal.push({ at: new Date().toISOString(), ...state });
        previous = encoded;
        await writeFile(path.join(output, 'manual-input.json'), JSON.stringify({ scope: 'isolated-development-profile', journal }, null, 2));
      }
    }
    let stop: { finish?: boolean } | undefined;
    try { stop = JSON.parse(await readFile(path.join(output, 'manual-stop.json'), 'utf8')); } catch { /* Not yet requested. */ }
    if (stop?.finish === true) {
      // This receipt confirms harness completion, not product acceptance.
      const sourceHashPreserved = initialHash === await hash();
      await writeFile(path.join(output, 'extension-test.json'), JSON.stringify({ passed: sourceHashPreserved, manualHarness: true, acceptancePassed: false, sourceHashPreserved, observations: journal.length }));
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Manual acceptance timed out; observations remain in .rtl/manual-input.json');
}
