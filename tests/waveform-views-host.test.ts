import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { createProject, loadProject } from '@rtl-dev/core';
import { parseVcd } from '@rtl-dev/waveform';

test('host persists multiple views across new run documents and protects cancelled edits and defaults', async () => {
  await mkdir('.dev/tests', { recursive: true }); const root = await mkdtemp(path.resolve('.dev/tests/view-host-'));
  await createProject(root, true);
  const files: string[] = [];
  for (const run of ['first', 'second']) {
    const directory = path.join(root, '.rtl/runs', run); await mkdir(directory, { recursive: true });
    const file = path.join(directory, 'wave.vcd'); files.push(file); await writeFile(file, 'fixture');
    await writeFile(path.join(directory, 'result.json'), JSON.stringify({ name: 'counter_basic', top: 'counter_basic_tb', directory, waveform: file }));
  }
  const metadata = parseVcd('$scope module tb $end $var wire 1 ! clk $end $upscope $end $enddefinitions $end #0 0! #5 1!');
  const storage = new Map<string, unknown>(); const prompts: (string | undefined)[] = []; const choices: (string | undefined)[] = [];
  let provider: any; const disposable = () => ({ dispose() {} });
  class Uri {
    scheme = 'file'; constructor(readonly fsPath: string) {}
    toString() { return this.fsPath; }
    static file(file: string) { return new Uri(file); }
    static joinPath(uri: Uri, file: string) { return new Uri(path.join(uri.fsPath, file)); }
  }
  const vscode = { Uri, ProgressLocation: { Notification: 1 },
    workspace: { workspaceFolders: [{ uri: new Uri(root) }], getConfiguration: () => ({ get: () => 'internal' }) },
    commands: { registerCommand: disposable },
    window: {
      registerCustomEditorProvider: (_: string, value: any) => { provider = value; return disposable(); },
      withProgress: (_: unknown, task: any) => task({}, { onCancellationRequested: disposable }),
      showInputBox: async () => prompts.shift(), showQuickPick: async () => choices.shift(), showWarningMessage: async () => choices.shift()
    }
  };
  const module = { exports: {} as any }, require = createRequire(import.meta.url);
  const source = await build({ entryPoints: ['packages/vscode/src/waveform.ts'], bundle: true, platform: 'node', format: 'cjs', write: false, external: ['vscode', '@rtl-dev/core', '@rtl-dev/waveform/client'] });
  const mocks: Record<string, any> = { vscode, '@rtl-dev/core': { loadProject }, '@rtl-dev/waveform/client': { WaveformSession: class { async load() { return metadata; } async dispose() {} } } };
  vm.runInNewContext(source.outputFiles[0].text, { module, exports: module.exports, require: (id: string) => mocks[id] ?? require(id), process, Buffer, AbortController, setTimeout, clearTimeout });
  const context = { subscriptions: [], extensionUri: new Uri(path.resolve('packages/vscode')), asAbsolutePath: (file: string) => file,
    globalState: { get: (key: string) => storage.get(key), update: async (key: string, value: any) => { storage.set(key, JSON.parse(JSON.stringify(value))); } } };
  module.exports.registerWaveform(context, async () => {});
  async function editor(file: string) {
    const doc = await provider.openCustomDocument(new Uri(file), {}, { onCancellationRequested: disposable });
    let message: any, close: () => void; const posts: any[] = [];
    await provider.resolveCustomEditor(doc, { webview: { asWebviewUri: (u: Uri) => u, cspSource: 'self', onDidReceiveMessage: (f: any) => { message = f; return disposable(); }, postMessage: (v: any) => { posts.push(v); } }, onDidDispose: (f: () => void) => { close = f; return disposable(); } });
    return { doc, posts, close: () => { close(); doc.dispose(); }, send: async (value: any) => { await message(value); } };
  }
  const first = await editor(files[0]);
  const peer = await editor(files[1]);
  const unrelated = await editor(path.join(root, 'standalone.vcd'));
  const snapshot = { radix: 'hex', signals: [{ path: 'tb.clk', color: 'pink' }] };
  prompts.push('Clock'); await first.send({ kind: 'viewEdit', action: 'save', view: snapshot });
  let saved = first.posts.filter(p => p.kind === 'views').at(-1); const id = saved.selectedId;
  assert.ok(id); assert.equal(saved.views.book.views.length, 1);
  assert.equal(peer.posts.at(-1).kind, 'viewsChanged');
  assert.equal(peer.posts.at(-1).views.book.views[0].id, id, 'An already open run receives the new view without reload');
  assert.equal(peer.posts.at(-1).selectedId, undefined, 'Peer notification must not select the originating tab view');
  assert.equal(unrelated.posts.length, 0, 'Standalone documents must not receive another test view collection');
  await first.send({ kind: 'viewEdit', action: 'default', viewId: id });
  assert.equal(peer.posts.at(-1).views.book.defaultId, id);
  peer.close(); unrelated.close();
  const closedPosts = peer.posts.length;
  first.doc.dispose();
  const second = await editor(files[1]); await second.send({ kind: 'ready' });
  const restored = second.posts.at(-1).views.book;
  assert.equal(restored.defaultId, id); assert.equal(restored.views[0].signals[0].color, 'pink');
  prompts.push('Counter'); await second.send({ kind: 'viewEdit', action: 'save', viewId: id, view: snapshot });
  saved = second.posts.filter(p => p.kind === 'views').at(-1); assert.equal(saved.views.book.views.length, 2);
  assert.equal(saved.views.book.defaultId, id);
  const before = JSON.stringify([...storage]);
  prompts.push('Clock'); choices.push(undefined); await second.send({ kind: 'viewEdit', action: 'save', viewId: id, view: { ...snapshot, signals: [] } });
  assert.equal(JSON.stringify([...storage]), before, 'Cancelled overwrite must preserve stored signals');
  choices.push('Rename view'); prompts.push(undefined); await second.send({ kind: 'viewEdit', action: 'manage', viewId: id });
  assert.equal(JSON.stringify([...storage]), before, 'Cancelled rename must preserve the entire collection');
  choices.push('Delete view', undefined); await second.send({ kind: 'viewEdit', action: 'manage', viewId: id });
  assert.equal(JSON.stringify([...storage]), before, 'Cancelled deletion must preserve the entire collection and default');
  choices.push('Rename view'); prompts.push('Startup'); await second.send({ kind: 'viewEdit', action: 'manage', viewId: id });
  saved = second.posts.filter(p => p.kind === 'views').at(-1); assert.equal(saved.views.book.defaultId, id); assert.equal(saved.views.book.views[0].name, 'Startup');
  choices.push('Delete view', 'Delete'); await second.send({ kind: 'viewEdit', action: 'manage', viewId: id });
  saved = second.posts.filter(p => p.kind === 'views').at(-1); assert.equal(saved.views.book.defaultId, undefined); assert.equal(saved.views.book.views.length, 1);
  assert.equal(peer.posts.length, closedPosts, 'Closed panels receive no later view updates');
  second.doc.dispose();
});
