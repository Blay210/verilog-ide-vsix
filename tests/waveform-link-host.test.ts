import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { TraceCursorHub, parseVcd, queryWindow, queryValues } from '@rtl-dev/waveform';

for (const requestKind of ['window', 'values']) test(`waveform host shares peer time and suppresses late ${requestKind} after recorded trace invalidation`, async () => {
  const data = parseVcd('$timescale 1 ps $end $scope module top $end $var wire 1 ! clk $end $upscope $end $enddefinitions $end #0 0! #10 1!');
  const hub = new TraceCursorHub(), views: any[] = [], commands = new Map<string, any>();
  let provider: any, receive: any, paused = false, release!: () => void;
  const gate = new Promise<void>(r => { release = r; }); const posts: any[] = [];
  const disposable = () => ({ dispose() {} });
  const result = { directory: 'D:/fixture/.rtl/runs/a', waveform: 'D:/fixture/.rtl/runs/a/wave.vcd', runId: '00000000-0000-4000-8000-000000000001', traceIdentity: { state: 'ready' } };
  const traces = { find: async () => result, async open() {
    const listeners = new Set<any>(); let disposed = false;
    const cursor = hub.connect({ directory: result.directory, runId: result.runId, inputFingerprint: 'a'.repeat(64), traceSha256: 'b'.repeat(64) }, data.end, data.timescale, state => listeners.forEach(listener => listener(state)));
    const view = { result, metadata: data, read: () => cursor.read(), set: (time: string) => cursor.set(time),
      subscribe: (listener: any) => { listeners.add(listener); return disposable(); }, invalidate: (reason: string) => cursor.invalidate(reason),
      session: { async window(request: any) { if (paused) await gate; return queryWindow(data, request); }, async values(request: any) { if (paused) await gate; return queryValues(data, request); }, async dispose() {} },
      dispose() { disposed = true; cursor.dispose(); listeners.clear(); }, get disposed() { return disposed; } };
    views.push(view); return view;
  } };
  class Uri { scheme = 'file'; constructor(readonly fsPath: string) {} toString() { return this.fsPath; } static joinPath(uri: Uri, file: string) { return new Uri(uri.fsPath + '/' + file); } }
  const vscode = { Uri, ProgressLocation: { Notification: 1 },
    workspace: { workspaceFolders: [], getConfiguration: () => ({ get: () => 'internal' }) },
    commands: { registerCommand: (id: string, action: any) => { commands.set(id, action); return disposable(); } },
    window: { registerCustomEditorProvider: (_: string, value: any) => { provider = value; return disposable(); }, withProgress: (_: any, task: any) => task({}, { onCancellationRequested: disposable }) }
  };
  const source = await build({ entryPoints: ['packages/vscode/src/waveform.ts'], bundle: true, platform: 'node', format: 'cjs', write: false, external: ['vscode', '@rtl-dev/core', '@rtl-dev/waveform/client'] });
  const module = { exports: {} as any }, require = createRequire(import.meta.url);
  const mocks: Record<string, any> = { vscode, '@rtl-dev/core': {}, '@rtl-dev/waveform/client': { WaveformSession: class { async dispose() {} } } };
  vm.runInNewContext(source.outputFiles[0].text, { module, exports: module.exports, require: (id: string) => mocks[id] ?? require(id), process, Buffer, AbortController, setTimeout, clearTimeout });
  module.exports.registerWaveform({ subscriptions: [], extensionUri: new Uri('D:/extension'), asAbsolutePath: (s: string) => s, globalState: { get() {} } }, async () => {}, traces);
  const document = await provider.openCustomDocument(new Uri(result.waveform), {}, { onCancellationRequested: disposable });
  await provider.resolveCustomEditor(document, { webview: { cspSource: 'self', asWebviewUri: (uri: Uri) => uri, onDidReceiveMessage: (f: any) => { receive = f; return disposable(); }, postMessage: (message: any) => posts.push(message) }, onDidDispose: disposable });
  await receive({ kind: 'ready' }); const token = posts.at(-1).link.token;
  await receive({ kind: 'traceCursor', token: 'obsolete', time: '10' }); assert.equal(views[0].read().time, '0');
  await receive({ kind: 'traceCursor', token, time: '10' }); assert.equal(views[0].read().time, '10'); assert.equal(posts.at(-1).kind, 'traceCursor');
  await receive({ kind: 'reload' }); assert.equal(posts.at(-1).link.time, '10', 'same-identity reload restores time when no peer survives');
  const peer = await traces.open(); peer.set('0'); assert.equal(posts.at(-1).link.time, '0');
  await receive({ kind: 'reload' }); const newToken = posts.at(-1).link.token; assert.notEqual(newToken, token); assert.ok(views[0].disposed);
  await receive({ kind: 'traceCursor', token, time: '10' }); assert.equal(peer.read().time, '0');
  paused = true; await receive({ kind: requestKind, requestId: 1, request: { signals: ['0'], from: '0', to: '10', cursor: '0', pixels: 10 } });
  peer.invalidate('Trace replaced'); assert.equal(posts.at(-1).kind, 'error'); assert.equal(document.metadata, undefined);
  release(); await new Promise(r => setTimeout(r, 10)); assert.ok(!posts.some(p => p.kind === requestKind && p.requestId === 1));
  document.dispose(); peer.dispose(); assert.ok(views.every(view => view.disposed));
});
