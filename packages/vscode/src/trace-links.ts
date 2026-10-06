import path from 'node:path';
import { loadRecordedInputs, loadRecordedTrace, readHistory, type TestResult } from '@rtl-dev/core';
import { TraceCursorHub, type TraceCursorState, type WaveMetadata, type ValuesRequest, type WaveValues } from '@rtl-dev/waveform';
import { WaveformSession } from '@rtl-dev/waveform/client';

export const tracePath = (file: string) => process.platform === 'win32' ? path.resolve(file).toLowerCase() : path.resolve(file);
export interface RecordedTraceView {
  result: TestResult;
  metadata: WaveMetadata;
  session: WaveformSession;
  read(): TraceCursorState;
  set(time: string): void;
  values(request: ValuesRequest): Promise<WaveValues>;
  subscribe(listener: (state: TraceCursorState) => void): { dispose(): void };
  invalidate(reason: string): void;
  dispose(): void;
}
/** Host orchestration without editor APIs. Core authenticates retained inputs;
 * workers consume those exact trace bytes. One instance is shared by both hosts.
 */
export class RecordedTraceLinks {
  private hub = new TraceCursorHub();
  private views = new Set<RecordedTraceView>();
  private opening = new Set<{ result: TestResult; abort: AbortController }>();
  private remembered = new Map<string, TestResult>();
  private closed = false;
  constructor(private workerFile: string) {}
  remember(result: TestResult) {
    if (result.waveform) {
      if (this.remembered.size >= 100) this.remembered.delete(this.remembered.keys().next().value!);
      this.remembered.set(tracePath(result.waveform), JSON.parse(JSON.stringify(result)));
    }
  }
  async find(file: string, roots: string[]): Promise<TestResult | undefined> {
    const known = this.remembered.get(tracePath(file)); if (known) return known;
    for (const root of roots) {
      try {
        const result = (await readHistory(root, 1000)).find(r => r.waveform && tracePath(r.waveform) === tracePath(file));
        if (result) { this.remember(result); return result; }
      } catch { /* Standalone/legacy traces remain ordinary waveform documents. */ }
    }
  }
  async open(value: TestResult, signal?: AbortSignal): Promise<RecordedTraceView> {
    if (this.closed) throw Error('Trace links closed.');
    if (this.views.size + this.opening.size >= 8) throw Error('Close another trace view first.');
    if (value.traceIdentity?.state !== 'ready') throw Error(value.traceIdentity?.reason ?? 'No verified VCD trace identity for this run.');
    const result: TestResult = JSON.parse(JSON.stringify(value));
    const abort = new AbortController(), pending = { result, abort }; this.opening.add(pending);
    const cancel = () => abort.abort(); signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
    const timer = setTimeout(cancel, 30000);
    let session: WaveformSession | undefined;
    const terminate = () => { void session?.dispose(); }; abort.signal.addEventListener('abort', terminate);
    try {
      const trace = await loadRecordedTrace(result, abort.signal);
      abort.signal.throwIfAborted(); session = new WaveformSession(this.workerFile);
      const parsed = await session.loadVerified(trace.bytes, trace.sha256);
      await loadRecordedInputs(result, abort.signal); abort.signal.throwIfAborted();
      const reader = session, listeners = new Set<(state: TraceCursorState) => void>(); let disposed = false;
      const cursor = this.hub.connect({ directory: tracePath(result.directory), runId: trace.runId, inputFingerprint: trace.inputFingerprint, traceSha256: parsed.sha256 }, parsed.metadata.end, parsed.metadata.timescale, state => {
        if (state.state === 'unavailable') void reader.dispose();
        for (const listener of [...listeners]) { try { listener(state); } catch { /* Other views must still receive invalidation. */ } }
      });
      const ready = () => { if (disposed || cursor.read().state !== 'ready') throw Error('Recorded trace is no longer verified. Refresh to reconnect.'); };
      const view: RecordedTraceView = {
        result, metadata: parsed.metadata, session: reader, read: () => cursor.read(),
        set: time => { ready(); cursor.set(time); },
        values: async request => { ready(); const values = await reader.values(request); ready(); return values; },
        subscribe: listener => { listeners.add(listener); return { dispose: () => { listeners.delete(listener); } }; },
        invalidate: reason => cursor.invalidate(reason),
        dispose: () => { if (disposed) return; disposed = true; cursor.dispose(); listeners.clear(); this.views.delete(view); void reader.dispose(); }
      };
      this.views.add(view); this.remember(result); return view;
    } catch (error) { await session?.dispose(); throw error; }
    finally { clearTimeout(timer); this.opening.delete(pending); signal?.removeEventListener('abort', cancel); abort.signal.removeEventListener('abort', terminate); }
  }
  changed(file: string) {
    const actual = tracePath(file);
    const affects = (result: TestResult) => {
      const directory = tracePath(result.directory);
      return actual === directory || actual === path.dirname(directory) || actual === path.dirname(path.dirname(directory)) || actual === path.join(directory, 'inputs') || actual.startsWith(path.join(directory, 'inputs') + path.sep) ||
        actual === path.join(directory, 'input-snapshot.json') || actual === path.join(directory, 'result.json') || (!!result.waveform && actual === tracePath(result.waveform));
    };
    for (const pending of this.opening) if (affects(pending.result)) pending.abort.abort();
    for (const view of this.views) if (affects(view.result)) view.invalidate('Recorded source or waveform changed. Refresh to verify it again.');
    for (const [key, result] of this.remembered) if (affects(result)) this.remembered.delete(key);
  }
  dispose() { this.closed = true; for (const pending of this.opening) pending.abort.abort(); for (const view of [...this.views]) view.dispose(); this.remembered.clear(); }
}
