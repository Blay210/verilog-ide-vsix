import * as vscode from 'vscode';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { performance, monitorEventLoopDelay } from 'node:perf_hooks';

/** Isolated diagnostic host only. Instrument actual worker exit, not document counts alone. */
export async function testWaveformLifecycle(profileMode = false, renderMode = false): Promise<void> {
  const root = vscode.workspace.workspaceFolders![0].uri.fsPath;
  const repository = path.resolve(vscode.extensions.getExtension('rtl-dev-local.rtl-dev')!.extensionPath, '../..');
  const baseline = JSON.parse(await readFile(path.join(repository, '.dev/waveform-scale-latest.json'), 'utf8'));
  const bytes = await readFile(path.join(baseline.root, 'signals-4096-steps-192.vcd'));
  const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex'), sha = hash(bytes);
  await mkdir(path.join(root, '.rtl'), { recursive: true });
  const files = ['lifecycle-a.vcd', 'lifecycle-b.vcd', 'pending.vcd'].map(n => path.join(root, '.rtl', n));
  for (const file of files) await writeFile(file, bytes);
  const threads = require('node:worker_threads') as typeof import('node:worker_threads');
  const NativeWorker = threads.Worker;
  const loads: any[] = [];
  const readers: { worker: import('node:worker_threads').Worker; exited: boolean; loading: boolean }[] = [];
  threads.Worker = class extends NativeWorker {
    constructor(file: any, options?: any) {
      super(file, options);
      if (!String(file).endsWith('waveform-worker.cjs')) return;
      const record = { worker: this, exited: false, loading: false }; readers.push(record);
      const createdAt = performance.now(); let onlineAt: number | undefined;
      this.once('online', () => onlineAt = performance.now());
      const sent = new Map<number, { file: string; at: number }>();
      const post = this.postMessage.bind(this);
      this.postMessage = ((message: any, ...rest: any[]) => {
        if (message.kind === 'load') {
          record.loading = true;
          if (profileMode) { sent.set(message.id, { file: message.file, at: performance.now() }); message = { ...message, profile: true }; }
        }
        return (post as any)(message, ...rest);
      }) as typeof this.postMessage;
      this.on('message', message => {
        if (message.result?.signals) record.loading = false;
        const request = sent.get(message.id);
        if (request) {
          sent.delete(message.id); const receivedAt = performance.now(), roundTripMs = receivedAt - request.at;
          loads.push({ file: request.file, createdAt, sentAt: request.at, receivedAt, onlineMs: onlineAt === undefined ? undefined : onlineAt - createdAt,
            roundTripMs, worker: message.profile, nonWorkerMs: message.profile ? Math.max(0, roundTripMs - message.profile.totalMs) : undefined });
        }
      });
      this.once('exit', () => { record.exited = true; });
    }
  };
  const states = () => vscode.commands.executeCommand<any[]>('rtl.getWaveformState');
  const tabs = () => vscode.window.tabGroups.all.flatMap(g => g.tabs).filter(t => t.input instanceof vscode.TabInputCustom && files.includes(t.input.uri.fsPath));
  const wait = async (predicate: () => boolean | Promise<boolean>) => {
    const start = performance.now();
    while (performance.now() - start < 20000) { if (await predicate()) return; await new Promise(r => setTimeout(r, 20)); }
    throw Error('Waveform lifecycle observation timed out');
  };
  let requestId = 1000000000;
  const value = (worker: import('node:worker_threads').Worker) => new Promise<any>((resolve, reject) => {
    const id = ++requestId;
    const listener = (message: any) => { if (message.id !== id) return; clearTimeout(timer); worker.off('message', listener); message.error ? reject(Error(message.error)) : resolve(message.result); };
    const timer = setTimeout(() => { worker.off('message', listener); reject(Error('Live peer value query timed out')); }, 5000);
    worker.on('message', listener); worker.postMessage({ id, kind: 'values', request: { signals: ['0'], cursor: '9007199254740994' } });
  });
  const loop = monitorEventLoopDelay({ resolution: 10 }); loop.enable();
  const report: any = { passed: false, synthetic: true, waveformLifecycle: true, initialMemory: process.memoryUsage(), cycles: [],
    notes: ['Actual custom-editor lifecycle and actual worker exit; requests inspected through a diagnostic Worker wrapper.', 'Extension-host RSS includes worker threads; parent heap is not worker heap. No forced GC or whole-workbench measurement.', 'Synthetic standalone VCDs; physical Cancel/button/canvas interaction and representative user design are separate.'] };
  let peakRss = report.initialMemory.rss;
  const poll = setInterval(() => peakRss = Math.max(peakRss, process.memoryUsage().rss), 25);
  report.profileMode = profileMode; report.phases = []; report.loads = loads;
  report.renderMode = renderMode; report.renderFrames = [];
  const memoryRecovery = process.env.RTL_WAVEFORM_MEMORY_TEST === '1';
  report.memoryRecoveryMode = memoryRecovery; report.idleMemorySamples = [];
  async function idleMemory(label: string, targets = [250, 1000, 3000]) {
    if (!memoryRecovery) return;
    // Observe natural recovery after actual worker exit; do not force host GC.
    const started = performance.now();
    for (const target of targets) {
      await new Promise(resolve => setTimeout(resolve, Math.max(0, target - (performance.now() - started))));
      assert.equal(readers.filter(reader => !reader.exited).length, 0);
      assert.equal((await states()).length, 0);
      report.idleMemorySamples.push({ label, elapsedMs: performance.now() - started, memory: process.memoryUsage(), liveWorkers: 0, documents: 0 });
    }
  }
  const renderStates = () => vscode.commands.executeCommand<any[]>('rtl.getWaveformRenderProfile');
  async function observeRenderer(file: string, cycle: number) {
    await wait(async () => (await renderStates()).find(d => d.file === file)?.profile?.samples.some((s: any) => s.visible && s.rows.length === 8));
    const profile = (await renderStates()).find(d => d.file === file).profile;
    const first = profile.samples.find((s: any) => s.visible && s.rows.length === 8);
    assert.ok(first.initToFrameMs >= first.initToDrawMs);
    for (let probe = 0; probe < 3; probe++) {
      const time = String(9007199254740994n + BigInt(probe));
      await vscode.commands.executeCommand('rtl.probeWaveformRenderer', file, time);
      await wait(async () => (await renderStates()).find(d => d.file === file)?.profile?.samples.some((s: any) => s.cursor === time && s.visible));
      const sample = (await renderStates()).find(d => d.file === file).profile.samples.find((s: any) => s.cursor === time && s.visible);
      assert.equal(sample.rows.find((r: any) => r.id === '0').value, probe === 0 ? 'zzzzzzzz' : (probe + 1).toString(2).padStart(8, '0'));
    }
    report.renderFrames.push({ file, cycle, samples: (await renderStates()).find(d => d.file === file).profile.samples });
  }
  async function phase<T>(name: string, action: () => PromiseLike<T>): Promise<T> {
    if (!profileMode) return action();
    loop.reset(); const start = performance.now();
    const result = await action(), actionMs = performance.now() - start;
    await new Promise(r => setTimeout(r, 25));
    report.phases.push({ name, start, actionMs, end: performance.now(), loopMaxMs: loop.max / 1e6 });
    return result;
  }
  try {
    const pending = vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(files[2]), 'rtl.waveform').then(() => undefined, error => String(error));
    await wait(() => readers.some(r => r.loading) && tabs().some(t => (t.input as vscode.TabInputCustom).uri.fsPath === files[2]));
    const closingDuringLoad = readers.find(r => r.loading)!;
    const tab = tabs().find(t => (t.input as vscode.TabInputCustom).uri.fsPath === files[2])!;
    assert.equal(await vscode.window.tabGroups.close(tab), true);
    await pending; await wait(() => closingDuringLoad.exited);
    await wait(async () => !(await states()).some(d => d.file === files[2]));
    report.pendingCloseRecovered = true;
    if (profileMode) await phase('warm-idle', () => new Promise(r => setTimeout(r, 1000)));
    await phase('memory-baseline-idle', () => idleMemory('baseline'));
    for (let cycle = 0; cycle < 4; cycle++) {
      const start = performance.now(), before = readers.length;
      for (const [index, file] of files.slice(0, 2).entries()) {
        await phase(`cycle-${cycle}-open-${index}`, () => vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(file), 'rtl.waveform'));
        if (renderMode) await phase(`cycle-${cycle}-render-${index}`, () => observeRenderer(file, cycle));
      }
      const documents = await states(); assert.equal(documents.length, 2);
      for (const d of documents) { assert.equal(d.metadata.signals.length, 4096); assert.equal(d.metadata.changes, 786432); assert.equal(d.link.state, 'unavailable'); }
      const peer = readers[before + 1]; assert.ok(peer); assert.equal((await phase(`cycle-${cycle}-query`, () => value(peer.worker))).rows[0].value, 'zzzzzzzz');
      await phase(`cycle-${cycle}-close-first`, async () => {
        await vscode.window.tabGroups.close(tabs().find(t => (t.input as vscode.TabInputCustom).uri.fsPath === files[0])!);
        await wait(() => readers[before].exited);
      });
      assert.equal(peer.exited, false); assert.equal((await value(peer.worker)).rows[0].value, 'zzzzzzzz');
      await phase(`cycle-${cycle}-close-peer`, async () => {
        await vscode.window.tabGroups.close(tabs().find(t => (t.input as vscode.TabInputCustom).uri.fsPath === files[1])!);
        await wait(() => peer.exited); await wait(async () => (await states()).length === 0);
      });
      await new Promise(r => setTimeout(r, 250));
      report.cycles.push({ cycle, durationMs: performance.now() - start, afterCloseMemory: process.memoryUsage(), started: readers.length, exited: readers.filter(r => r.exited).length, peerPreserved: true });
      await phase(`cycle-${cycle}-idle-recovery`, () => idleMemory(`cycle-${cycle}`));
    }
    if (memoryRecovery) {
      await phase('final-idle-recovery', () => idleMemory('final', [1000, 5000, 15000]));
      const steady = report.idleMemorySamples.filter((sample: any) => sample.elapsedMs >= 2900);
      report.memoryRecovery = {
        baseline: steady[0].memory, final: steady.at(-1).memory,
        postWarmCycleRssGrowthBytes: steady.at(-1).memory.rss - steady[1].memory.rss,
        postWarmCycleHeapGrowthBytes: steady.at(-1).memory.heapUsed - steady[1].memory.heapUsed,
        finalMinusBaselineRssBytes: steady.at(-1).memory.rss - steady[0].memory.rss,
        rssReturnedWithin16MiBOfBaseline: steady.at(-1).memory.rss <= steady[0].memory.rss + 16 * 1048576
      };
      report.notes.push('Three natural idle samples per completed close, then a final 15-second idle; no GC. 16 MiB baseline band is diagnostic only. Worker exit/document absence assertions are separate from RSS acceptance; retained diagnostic Worker records and fixture bytes remain in host memory.');
    }
    for (const file of files) assert.equal(hash(await readFile(file)), sha);
    report.sourceHashPreserved = true; report.passed = true;
  } catch (error) { report.error = String(error); throw error; }
  finally {
    for (const tab of tabs()) await vscode.window.tabGroups.close(tab);
    for (const reader of readers) if (!reader.exited) await reader.worker.terminate();
    threads.Worker = NativeWorker; clearInterval(poll); loop.disable();
    report.startedWorkers = readers.length; report.exitedWorkers = readers.filter(r => r.exited).length;
    report.peakRss = peakRss; report.afterMemory = process.memoryUsage();
    report.hostEventLoopMaxMs = profileMode ? Math.max(...report.phases.map((p: any) => p.loopMaxMs)) : loop.max / 1e6;
    if (profileMode) report.notes.push('Per-phase loop maxima exclude initial cancellation/setup. Open includes workbench IPC and editor setup; worker nonWorkerMs includes startup, queue/scheduling and serialization, not pure IPC.');
    if (renderMode) report.notes.push('Renderer samples cover real window roundtrips, synchronous canvas drawing and double-RAF opportunity, not compositor presentation or physical pointer latency. Each editor is observed while visible before its peer opens. Probes persist cursor only in isolated development fixture state.');
    await writeFile(path.join(root, '.rtl/extension-test.json'), JSON.stringify(report, null, 2));
  }
}
