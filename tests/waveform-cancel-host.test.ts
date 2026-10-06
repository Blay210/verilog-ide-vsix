import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { parseVcd, TraceCursorHub } from '@rtl-dev/waveform';

const compiled = build({ entryPoints: ['packages/vscode/src/waveform.ts'], bundle: true, platform: 'node', format: 'cjs', write: false,
  external: ['vscode', '@rtl-dev/core', '@rtl-dev/semantic', '@rtl-dev/toolchain', '@rtl-dev/waveform/client'] });
const gate = () => { let resolve!: () => void; const promise = new Promise<void>(r => resolve = r); return { promise, resolve }; };
async function host(recorded: boolean) {
  let provider: any, receive: any, pause = false, cancellation: (() => void) | undefined;
  const entered = gate(), release = gate(), disposal = gate(), terminating = gate();
  const wave = parseVcd('$scope module tb $end $var wire 1 ! clk $end $upscope $end $enddefinitions $end #0 0! #10 1!');
  const commands = new Map<string, any>(), posts: any[] = [], readers: any[] = [], views: any[] = [], hub = new TraceCursorHub();
  class Reader {
    disposed = false; constructor() { readers.push(this); }
    async dispose() { this.disposed = true; if (pause && this === views.at(-1)?.session) { terminating.resolve(); await disposal.promise; } }
    async load() { if (pause) { entered.resolve(); await release.promise; } return wave; }
  }
  const result = { name: 'states', top: 'tb', directory: 'D:/project/.rtl/runs/a', runId: '00000000-0000-4000-8000-000000000001', waveform: 'D:/project/wave.vcd', traceIdentity: { state: 'ready' } };
  const traces = { find: async () => recorded ? result : undefined, async open() {
    const cursor = hub.connect({ directory: result.directory, runId: result.runId, inputFingerprint: 'a'.repeat(64), traceSha256: 'b'.repeat(64) }, wave.end, wave.timescale, () => {});
    const view = { result, metadata: wave, session: new Reader(), read: () => cursor.read(), set: cursor.set, subscribe: () => ({ dispose() {} }), disposed: false,
      dispose() { this.disposed = true; cursor.dispose(); void this.session.dispose(); } };
    views.push(view); return view;
  } };
  const disposable = () => ({ dispose() {} });
  class Uri { scheme = 'file'; constructor(readonly fsPath: string) {} toString() { return this.fsPath; } static joinPath(uri: Uri, file: string) { return new Uri(uri.fsPath + '/' + file); } }
  const vscode = { Uri, ProgressLocation: { Notification: 1 }, workspace: { isTrusted: true, workspaceFolders: [], getConfiguration: () => ({ get: () => 'internal' }) },
    commands: { registerCommand: (id: string, action: any) => { commands.set(id, action); return disposable(); } }, window: {
      registerCustomEditorProvider: (_: string, value: any) => { provider = value; return disposable(); },
      withProgress: (_: any, task: any) => task({}, { onCancellationRequested: (f: any) => { cancellation = f; return disposable(); } })
    } };
  const mocks: Record<string, any> = { vscode, '@rtl-dev/core': {}, '@rtl-dev/semantic': {}, '@rtl-dev/waveform/client': { WaveformSession: Reader },
    '@rtl-dev/toolchain': { toolsHome: () => 'D:/tools', detectSemanticRuntime: async () => { if (pause) { entered.resolve(); await release.promise; } return undefined; } } };
  const module = { exports: {} as any }, require = createRequire(import.meta.url);
  vm.runInNewContext((await compiled).outputFiles[0].text, { module, exports: module.exports, require: (id: string) => mocks[id] ?? require(id), process, Buffer, AbortController, setTimeout, clearTimeout });
  module.exports.registerWaveform({ subscriptions: [], extensionUri: new Uri('D:/extension'), asAbsolutePath: (s: string) => s, globalState: { get() {} } }, async () => {}, traces);
  const document = await provider.openCustomDocument(new Uri(result.waveform), {}, { onCancellationRequested: disposable });
  await provider.resolveCustomEditor(document, { webview: { cspSource: 'self', asWebviewUri: (u: any) => u, onDidReceiveMessage: (f: any) => { receive = f; return disposable(); }, postMessage: (m: any) => posts.push(m) }, onDidDispose: disposable });
  return { document, posts, views, commands, traces, entered, release, disposal, terminating, cancel: () => cancellation!(), pause: (value: boolean) => pause = value, receive: (m: any) => receive(m), readers };
}
test('cancel during recorded enum preparation clears metadata/link, awaits reader exit, preserves peer and retries', async () => {
  const h = await host(true), peer = await h.traces.open(); peer.set('10');
  h.pause(true); let finished = false;
  const reload = h.receive({ kind: 'reload' }).then(() => finished = true);
  await h.entered.promise; h.cancel(); h.release.resolve(); await h.terminating.promise;
  await new Promise(r => setTimeout(r, 5)); assert.equal(finished, false, 'loading completion waits for actual reader disposal');
  assert.equal(h.document.metadata, undefined); assert.equal(h.document.trace, undefined);
  h.disposal.resolve(); await reload;
  assert.equal(h.views.at(-1).disposed, true); assert.equal(peer.read().state, 'ready'); assert.equal(peer.read().time, '10');
  assert.throws(() => h.commands.get('rtl.setWaveformTime')('D:/project/wave.vcd', '0'), /verified/);
  h.pause(false); await h.receive({ kind: 'reload' }); assert.ok(h.document.metadata); assert.equal(h.document.trace.read().time, '10');
  h.document.dispose(); peer.dispose();
});
test('late standalone load after cancellation cannot publish metadata; reload recovers', async () => {
  const h = await host(false); h.pause(true);
  const reload = h.receive({ kind: 'reload' }); await h.entered.promise; h.cancel(); h.release.resolve(); await reload;
  assert.equal(h.document.metadata, undefined); assert.equal(h.document.trace, undefined);
  assert.ok(h.posts.some(m => m.kind === 'error')); h.pause(false); await h.receive({ kind: 'reload' });
  assert.ok(h.document.metadata); assert.equal(h.posts.at(-1).kind, 'init'); h.document.dispose();
});
