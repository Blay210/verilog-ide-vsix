import * as vscode from 'vscode';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { WaveformSession } from '@rtl-dev/waveform/client';
import { parseView, parseViewBook, putView, deleteView, retainMissing, type WaveMetadata, type ViewBook } from '@rtl-dev/waveform';
import { findWaveTest, type WaveTestContext } from './waveform-views';
import { waveformHtml } from './waveform-html';
import { RecordedTraceLinks, type RecordedTraceView } from './trace-links';
import type { TraceCursorState } from '@rtl-dev/waveform';
import { SlangProvider } from '@rtl-dev/semantic';
import { detectSemanticRuntime, toolsHome } from '@rtl-dev/toolchain';
import { recordedEnums } from './recorded-enums';
import { performance } from 'node:perf_hooks';
import { parseRenderProbe, parseRenderDetails, parseHostWindowTiming, validRenderTimings, type RenderProbe } from './render-probe';

interface WaveDocument extends vscode.CustomDocument { test?: WaveTestContext; session: WaveformSession; metadata?: WaveMetadata; generation: number; disposed: boolean; trace?: RecordedTraceView; loadingAbort?: AbortController; linkToken: string; linkReason?: string; onTrace?: (state: TraceCursorState) => void; renderProfile?: { nonce: string; initSentAt: number; samples: any[] }; probeRenderer?: (time: string, options?: RenderProbe) => void }
export function registerWaveform(context: vscode.ExtensionContext, external: (file: string) => Promise<void>, traces = new RecordedTraceLinks(context.asAbsolutePath('dist/waveform-worker.cjs'))): (file: string) => Promise<void> {
  const documents = new Map<string, WaveDocument>();
  const renderProfiling = ['1', 'stress'].includes(process.env.RTL_WAVEFORM_RENDER_TEST ?? '') && [vscode.ExtensionMode.Development, vscode.ExtensionMode.Test].includes(context.extensionMode);
  // Baseline comparison override is development-only; ordinary readers reuse a viewport.
  const cursorReuse = !(renderProfiling && process.env.RTL_WAVEFORM_CURSOR_REUSE_TEST === '0');
  if (renderProfiling) context.subscriptions.push(vscode.commands.registerCommand('rtl.getWaveformRenderProfile', () => [...documents.values()].map(d => ({ file: d.uri.fsPath, profile: d.renderProfile }))),
    vscode.commands.registerCommand('rtl.probeWaveformRenderer', (file: string, time: string, options?: unknown) => {
      const document = [...documents.values()].find(d => d.uri.fsPath === file);
      if (!document?.probeRenderer || typeof time !== 'string' || !/^\d{1,40}$/.test(time)) throw Error('Renderer probe is unavailable.');
      document.probeRenderer(time, parseRenderProbe(options));
    }));
  const viewListeners = new Set<{ key: string; notify: () => void }>();
  let viewQueue: Promise<unknown> = Promise.resolve();
  const workerFile = context.asAbsolutePath('dist/waveform-worker.cjs');
  const report = (error: unknown) => { void vscode.window.showErrorMessage(`RTL waveform: ${String(error)}`); };
  async function read(document: WaveDocument, token?: vscode.CancellationToken): Promise<void> {
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: `Reading ${path.basename(document.uri.fsPath)}`, cancellable: true }, async (_, progressToken) => {
      const abort = new AbortController();
      document.loadingAbort = abort;
      const cancel = () => { abort.abort(); void document.session.dispose(); };
      const subscriptions = [progressToken.onCancellationRequested(cancel), token?.onCancellationRequested(cancel)];
      const timeout = setTimeout(cancel, 30000);
      try {
        if (token?.isCancellationRequested || progressToken.isCancellationRequested) { cancel(); throw Error('Waveform loading cancelled.'); }
        const previous = document.trace?.read().state === 'ready' ? { result: document.trace.result, time: document.trace.read().time } : undefined;
        document.linkToken = randomBytes(16).toString('hex'); document.trace?.dispose(); document.trace = undefined;
        const result = await traces.find(document.uri.fsPath, (vscode.workspace.workspaceFolders ?? []).map(f => f.uri.fsPath));
        if (result?.traceIdentity?.state === 'ready') {
          try {
            const linked = await traces.open(result, abort.signal);
            if (document.disposed || abort.signal.aborted) { linked.dispose(); throw Error('Waveform loading cancelled.'); }
            await document.session.dispose();
            if (document.disposed || abort.signal.aborted) { linked.dispose(); throw Error('Waveform loading cancelled.'); }
            document.session = linked.session; document.metadata = linked.metadata; document.trace = linked; document.linkReason = undefined;
            linked.subscribe(state => { if (document.trace === linked && !document.disposed) document.onTrace?.(state); });
            // Restore only a freshly created same-identity cursor; a surviving peer owns its time.
            if (previous && linked.read().revision === 0 && previous.result.directory === linked.result.directory && previous.result.runId === linked.result.runId &&
                JSON.stringify(previous.result.inputIdentity) === JSON.stringify(linked.result.inputIdentity) && JSON.stringify(previous.result.traceIdentity) === JSON.stringify(linked.result.traceIdentity)) linked.set(previous.time);
            if (vscode.workspace.isTrusted === true) {
              try {
                const python = await detectSemanticRuntime({ signal: abort.signal });
                if (python) {
                  const semantic = new SlangProvider(python, context.asAbsolutePath('dist/analyze.py'), path.join(toolsHome(), 'cache', 'semantic'));
                  const enumLabels = await recordedEnums(linked.result, linked.metadata, semantic, abort.signal);
                  if (linked.read().state !== 'ready') throw Error('Recorded trace became unavailable during enum analysis.');
                  document.metadata = { ...linked.metadata, enumLabels };
                }
              } catch (error) {
                if (abort.signal.aborted) throw error;
                document.metadata = { ...linked.metadata, warnings: [...linked.metadata.warnings, `Enum names unavailable: ${String(error)}`] };
              }
            }
            abort.signal.throwIfAborted();
            if (linked.read().state !== 'ready') throw Error('Recorded trace became unavailable during loading.');
            return;
          } catch (error) {
            if (abort.signal.aborted) throw error;
            document.trace?.dispose(); document.trace = undefined;
            await document.session.dispose(); document.session = new WaveformSession(workerFile);
            document.metadata = undefined; document.linkReason = String(error);
          }
        } else document.linkReason = 'Standalone or older waveform — cursor is not linked to a recorded structure.';
        abort.signal.throwIfAborted();
        const metadata = await document.session.load(document.uri.fsPath);
        abort.signal.throwIfAborted();
        document.metadata = metadata;
      } finally {
        clearTimeout(timeout);
        if (abort.signal.aborted) {
          // Cancellation after trace attachment (e.g. enum analysis) must not
          // leave a ready cursor pointing at a terminated reader.
          document.generation++; document.trace?.dispose(); document.trace = undefined;
          document.metadata = undefined; document.linkReason = 'Waveform loading cancelled. Reload to retry.';
          await document.session.dispose();
        }
        if (document.loadingAbort === abort) document.loadingAbort = undefined;
        subscriptions.forEach(s => s?.dispose());
      }
    });
  }
  const provider: vscode.CustomReadonlyEditorProvider<WaveDocument> = {
    async openCustomDocument(uri, _, token) {
      if (uri.scheme !== 'file' || !/\.vcd$/i.test(uri.fsPath)) throw Error('The built-in viewer opens local VCD files. Use GTKWave for FST.');
      if (documents.size >= 4) throw Error('Close another waveform first (maximum four open traces).');
      const document: WaveDocument = {
        uri, session: new WaveformSession(workerFile), generation: 0, disposed: false, linkToken: '',
        dispose() { document.disposed = true; document.generation++; document.loadingAbort?.abort(); document.trace?.dispose(); document.onTrace = undefined; documents.delete(uri.toString()); void document.session.dispose(); }
      };
      documents.set(uri.toString(), document);
      try { await read(document, token); document.test = await findWaveTest(uri.fsPath, (vscode.workspace.workspaceFolders ?? []).map(f => f.uri.fsPath)); return document; }
      catch (error) { document.dispose(); throw error; }
    },
    async resolveCustomEditor(document, panel) {
      panel.webview.options = { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist')] };
      const script = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'dist/waveform.js'));
      const css = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'dist/waveform.css'));
      panel.webview.html = waveformHtml(script.toString(), css.toString(), panel.webview.cspSource, randomBytes(16).toString('hex'));
      let disposed = false, busy = false, reloading = false, queued: any;
      const post = (message: any) => { if (message.kind === 'loading') document.renderProfile = undefined; if (!disposed && !document.disposed) void panel.webview.postMessage(message); };
      const views = () => {
        if (!document.test) return { reason: 'Saved views are available for test results in an open RTL project.' };
        try { return { book: parseViewBook(context.globalState.get(document.test.key)), label: document.test.label }; }
        catch (error) { return { reason: String(error) }; }
      };
      const link = () => ({ token: document.linkToken, ...document.trace?.read(), runId: document.trace?.result.runId, reason: document.trace?.read().reason ?? document.linkReason });
      const init = () => {
        if (renderProfiling) document.renderProfile = { nonce: randomUUID(), initSentAt: performance.now(), samples: [] };
        post({ kind: 'init', name: path.basename(document.uri.fsPath), metadata: document.metadata, views: views(), link: link(),
          cursorReuse, ...(document.renderProfile ? { renderProfile: document.renderProfile.nonce } : {}) });
      };
      if (renderProfiling) document.probeRenderer = (time, options) => { if (document.renderProfile) post({ kind: 'renderProbe', nonce: document.renderProfile.nonce, time, options }); };
      document.onTrace = state => {
        if (state.state === 'unavailable') {
          document.generation++; queued = undefined; document.metadata = undefined; post({ kind: 'loading' });
          post({ kind: 'error', error: `${state.reason} Reload to reopen the waveform; values remain unlinked until verification succeeds.` });
        } else post({ kind: 'traceCursor', link: link() });
      };
      const viewListener = document.test ? { key: document.test.key, notify: () => post({ kind: 'viewsChanged', views: views() }) } : undefined;
      if (viewListener) viewListeners.add(viewListener);
      let editingView = false;
      async function editView(message: any) {
        if (!document.test || !document.metadata) throw Error('Open a waveform from an RTL test result to save test-specific views.');
        let book = parseViewBook(context.globalState.get(document.test.key));
        let selectedId: string | undefined = message.viewId;
        const previous = book.views.find(v => v.id === selectedId);
        if (message.action === 'save') {
          const snapshot = parseView({ ...message.view, id: 'pending', name: 'pending' });
          const name = await vscode.window.showInputBox({ title: `Save waveform view · ${document.test.label}`, prompt: 'Choose a name. Use a different name to keep another view.', value: previous?.name ?? '', placeHolder: 'e.g. Reset sequence', validateInput: v => !v.trim() || v.trim().length > 60 || /[\x00-\x1f]/.test(v) ? 'Enter a name of 1–60 characters.' : undefined });
          if (name === undefined || disposed) return;
          const existing = book.views.find(v => v.name.toLowerCase() === name.trim().toLowerCase());
          if (existing && await vscode.window.showWarningMessage(`Replace saved view “${existing.name}”?`, { modal: true }, 'Replace') !== 'Replace') return;
          if (disposed) return;
          selectedId = existing?.id ?? randomUUID();
          book = putView(book, { ...snapshot, id: selectedId, name: name.trim(), signals: retainMissing(snapshot.signals, previous, document.metadata.signals) });
        } else if (message.action === 'default' && previous) {
          book = parseViewBook({ ...book, defaultId: book.defaultId === previous.id ? undefined : previous.id });
        } else if (message.action === 'manage' && previous) {
          const action = await vscode.window.showQuickPick(['Rename view', 'Delete view'], { title: previous.name });
          if (!action || disposed) return;
          if (action === 'Rename view') {
            const name = await vscode.window.showInputBox({ title: 'Rename waveform view', value: previous.name });
            if (name === undefined || disposed) return;
            book = putView(book, { ...previous, name: name.trim() });
          } else {
            if (await vscode.window.showWarningMessage(`Delete saved view “${previous.name}”?`, { modal: true }, 'Delete') !== 'Delete' || disposed) return;
            book = deleteView(book, previous.id); selectedId = undefined;
          }
        } else throw Error('Select a saved view first.');
        if (disposed || document.disposed) return;
        await context.globalState.update(document.test.key, book);
        post({ kind: 'views', views: views(), selectedId });
        for (const listener of viewListeners) {
          if (listener !== viewListener && listener.key === document.test.key) listener.notify();
        }
      }

      const pump = async () => {
        if (busy) return; busy = true;
        try {
          while (queued && !disposed && !reloading) {
            const message = queued; queued = undefined; const generation = document.generation;
            const started = renderProfiling ? performance.now() : 0;
            try {
              const result = message.kind === 'window' ? await document.session.window(message.request) : message.kind === 'values' ? await document.session.values({ signals: message.request.signals, cursor: message.request.cursor }) : await document.session.edge(message.signal, message.time, message.direction);
              if (generation === document.generation && !queued) post({ kind: message.kind, requestId: message.requestId, result,
                ...(renderProfiling && ['window', 'values'].includes(message.kind) ? { hostTiming: { queueMs: started - message.hostReceivedAt, windowMs: performance.now() - started } } : {}) });
            } catch (error) { if (generation === document.generation && !queued) post({ kind: 'error', error: String(error), requestId: message.requestId }); }
          }
        } finally { busy = false; }
      };
      const subscription = panel.webview.onDidReceiveMessage(async message => {
        if (!message || disposed || document.disposed) return;
        try {
          if (message.kind === 'renderProfile') {
            const profile = renderProfiling && document.renderProfile;
            if (!profile || message.nonce !== profile.nonce || profile.samples.length >= 16 || !Number.isSafeInteger(message.requestId)
              || typeof message.visible !== 'boolean' || typeof message.cursor !== 'string' || !/^\d{1,40}$/.test(message.cursor) || !validRenderTimings(message)
              || !Array.isArray(message.rows) || message.rows.length > 32 || !message.rows.every((row: any) => typeof row?.id === 'string' && row.id.length <= 16 && typeof row.value === 'string' && row.value.length <= 16384)) return;
            let details;
            try { details = parseRenderDetails(message.details); } catch { return; }
            const drawPhases: Record<string, number> = {};
            for (const key of ['prepareMs', 'parentPlotMs', 'bitProjectMs', 'bitPlotMs']) {
              const value = message.drawPhases?.[key];
              if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 120000) drawPhases[key] = value;
            }
            profile.samples.push({ requestId: message.requestId, visible: message.visible, rows: message.rows, cursor: message.cursor, details,
              ...(parseHostWindowTiming(message.hostTiming) ? { hostTiming: parseHostWindowTiming(message.hostTiming) } : {}),
              drawPhases,
              queryRoundTripMs: message.queryRoundTripMs, drawMs: message.drawMs, initToDrawMs: message.initToDrawMs,
              initToFrameMs: message.initToFrameMs, hostSinceInitMs: performance.now() - profile.initSentAt });
            return;
          }
          if (message.kind === 'ready') { init(); return; }
          if (message.kind === 'traceCursor') {
            if (!reloading && message.token === document.linkToken && document.trace?.read().state === 'ready' && typeof message.time === 'string') document.trace.set(message.time);
            return;
          }
          if (message.kind === 'viewEdit') {
            if (editingView || reloading) return;
            editingView = true;
            try {
              const job = viewQueue.then(() => editView(message)); viewQueue = job.catch(() => {}); await job;
            } catch (error) { post({ kind: 'viewError', error: String(error) }); }
            finally { editingView = false; post({ kind: 'viewDone' }); }
            return;
          }
          if (message.kind === 'external') { await external(document.uri.fsPath); return; }
          if (message.kind === 'reload' && !reloading && !editingView) {
            reloading = true; document.generation++; queued = undefined; post({ kind: 'loading' });
            try { await document.session.dispose(); document.session = new WaveformSession(workerFile); document.metadata = undefined; await read(document); init(); }
            finally { reloading = false; }
            return;
          }
          if (reloading || !Number.isSafeInteger(message.requestId) || !['window', 'edge', ...(cursorReuse ? ['values'] : [])].includes(message.kind)) return;
          queued = renderProfiling ? { ...message, hostReceivedAt: performance.now() } : message; void pump();
        } catch (error) { post({ kind: 'error', error: String(error) }); }
      });
      panel.onDidDispose(() => { disposed = true; queued = undefined; document.onTrace = undefined; document.probeRenderer = undefined; document.renderProfile = undefined; subscription.dispose(); if (viewListener) viewListeners.delete(viewListener); });
    }
  };
  context.subscriptions.push(vscode.window.registerCustomEditorProvider('rtl.waveform', provider, { supportsMultipleEditorsPerDocument: false, webviewOptions: { retainContextWhenHidden: true } }),
    { dispose: () => { for (const document of [...documents.values()]) document.dispose(); } });
  async function open(file: string) {
    if (/\.fst$/i.test(file) || vscode.workspace.getConfiguration('rtl').get<string>('waveform.viewer', 'internal') === 'external') { await external(file); return; }
    try { await vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(file), 'rtl.waveform'); }
    catch (error) {
      const choice = await vscode.window.showErrorMessage(`Cannot open built-in waveform: ${String(error)}`, 'Open in GTKWave');
      if (choice) await external(file);
    }
  }
  async function choose(value?: vscode.Uri | string) {
    if (typeof value === 'string') return value;
    if (value instanceof vscode.Uri) return value.fsPath;
    return (await vscode.window.showOpenDialog({ canSelectMany: false, filters: { Waveforms: ['vcd', 'fst'] }, title: 'Open waveform' }))?.[0].fsPath;
  }
  context.subscriptions.push(vscode.commands.registerCommand('rtl.openWaveform', async value => { try { const file = await choose(value); if (file) await open(file); } catch (error) { report(error); } }),
    vscode.commands.registerCommand('rtl.openWaveformExternal', async value => { try { const file = await choose(value); if (file) await external(file); } catch (error) { report(error); } }),
    vscode.commands.registerCommand('rtl.setWaveformTime', (file: string, time: string) => { const document = [...documents.values()].find(d => path.resolve(d.uri.fsPath) === path.resolve(file)); if (!document?.trace || document.trace.read().state !== 'ready') throw Error('Open a verified recorded waveform first.'); document.trace.set(time); }),
    vscode.commands.registerCommand('rtl.getWaveformState', () => [...documents.values()].map(d => ({ file: d.uri.fsPath, metadata: d.metadata, test: d.test,
      link: d.trace ? { ...d.trace.read(), token: d.linkToken, runId: d.trace.result.runId } : { state: 'unavailable', reason: d.linkReason } }))));
  return open;
}
