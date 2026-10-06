import * as vscode from 'vscode';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { performance, monitorEventLoopDelay } from 'node:perf_hooks';

/** Actual webview maximum-row/viewport/reload path; no physical input claim. */
export async function testWaveformRenderStress(): Promise<void> {
  const root = vscode.workspace.workspaceFolders![0].uri.fsPath;
  const repository = path.resolve(vscode.extensions.getExtension('rtl-dev-local.rtl-dev')!.extensionPath, '../..');
  const baseline = JSON.parse(await readFile(path.join(repository, '.dev/waveform-scale-latest.json'), 'utf8'));
  await mkdir(path.join(root, '.rtl'), { recursive: true });
  const medium = path.join(root, '.rtl/stress-medium.vcd'), dense = path.join(root, '.rtl/stress-dense.vcd');
  const origin = 9007199254740993n;
  const value = (id: number, step: number) => id % 128 === 0 && step % 17 === 0 ? 'xxxxxxxx' : id % 128 === 0 && step % 17 === 1 ? 'zzzzzzzz' : ((id + step) % 256).toString(2).padStart(8, '0');
  await writeFile(medium, await readFile(path.join(baseline.root, 'signals-4096-steps-192.vcd')));
  const lines = ['$timescale 1 ps $end', '$scope module top $end'];
  for (let id = 0; id < 32; id++) lines.push(`$var wire 8 c${id} port_${id} [7:0] $end`);
  lines.push('$upscope $end', '$enddefinitions $end');
  for (let step = 0; step < 4096; step++) {
    lines.push('#' + (origin + BigInt(step)));
    for (let id = 0; id < 32; id++) lines.push(`b${value(id, step)} c${id}`);
  }
  await writeFile(dense, lines.join('\n'));
  const hash = async (file: string) => createHash('sha256').update(await readFile(file)).digest('hex');
  const hashes = await Promise.all([medium, dense].map(hash));
  const threads = require('node:worker_threads') as typeof import('node:worker_threads'), NativeWorker = threads.Worker;
  const readers: { worker: import('node:worker_threads').Worker; exited: boolean; loading: boolean }[] = [];
  const windowQueries: any[] = [];
  const payloadFixtures = new Map<string, any>();
  let pendingWindows = 0;
  let windowStarted: (() => void) | undefined;
  threads.Worker = class extends NativeWorker {
    constructor(file: any, options?: any) {
      super(file, options); if (!String(file).endsWith('waveform-worker.cjs')) return;
      const record = { worker: this, exited: false, loading: false }; readers.push(record); this.once('exit', () => record.exited = true);
      const pending = new Map<number, { at: number; request: any }>(), post = this.postMessage.bind(this);
      this.postMessage = ((message: any, ...rest: any[]) => {
        if (message.kind === 'load') record.loading = true;
        if (['window', 'values'].includes(message.kind)) { if (message.kind === 'window') pendingWindows++; pending.set(message.id, { at: performance.now(), request: { ...message.request, kind: message.kind } }); message = { ...message, profile: true }; }
        const result = (post as any)(message, ...rest);
        if (message.kind === 'window' && windowStarted) { const notify = windowStarted; windowStarted = undefined; notify(); }
        return result;
      }) as typeof this.postMessage;
      this.on('message', message => {
        if (message.result?.signals) record.loading = false;
        const sent = pending.get(message.id); if (!sent) return; pending.delete(message.id); if (sent.request.kind === 'window') pendingWindows--;
        windowQueries.push({ request: sent.request, roundTripMs: performance.now() - sent.at, worker: message.profile, error: message.error,
          ...(sent.request.kind === 'values' ? { bytes: Buffer.byteLength(JSON.stringify(message.result)) } : {}) });
        // Retain only one sparse/dense payload. Benchmark after UI/lifecycle phases,
        // never stringify in the measured message path. Not an RSS baseline trial.
        if (message.result?.rows?.length === 32) {
          const kind = message.result.rows.some((row: any) => row.dense) ? 'dense' : 'sparse';
          if (!payloadFixtures.has(kind)) payloadFixtures.set(kind, message.result);
        }
      });
    }
  };
  const state = () => vscode.commands.executeCommand<any[]>('rtl.getWaveformRenderProfile');
  const tabs = () => vscode.window.tabGroups.all.flatMap(group => group.tabs).filter(tab => tab.input instanceof vscode.TabInputCustom && [medium, dense].includes(tab.input.uri.fsPath));
  const wait = async (check: () => Promise<boolean> | boolean) => {
    const start = performance.now();
    while (performance.now() - start < 20000) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 20)); }
    throw Error('Renderer stress observation timed out');
  };
  const report: any = { passed: false, synthetic: true, rendererStress: true, initialMemory: process.memoryUsage(), cases: [], phases: [], windowQueries,
    notes: ['Actual webview probes, DOM bit labels, window transport and reader exits. Double-RAF opportunity is not pixel presentation.',
      '32 parent+128 bit rows include offscreen rows; viewport screenshot/pointer/scroll responsiveness is separate. No forced GC.'] };
  const loop = monitorEventLoopDelay({ resolution: 10 }); loop.enable(); let peakRss = process.memoryUsage().rss;
  const poll = setInterval(() => peakRss = Math.max(peakRss, process.memoryUsage().rss), 25);
  async function phase(name: string, action: () => PromiseLike<void>) {
    loop.reset(); const start = performance.now(); await action(); await new Promise(resolve => setTimeout(resolve, 25));
    report.phases.push({ name, durationMs: performance.now() - start, loopMaxMs: loop.max / 1e6 });
  }
  async function probe(file: string, name: string, step: number, from: number, to: number, denseExpected: boolean) {
    const profile = (await state()).find(d => d.file === file).profile, count = profile.samples.length;
    await vscode.commands.executeCommand('rtl.probeWaveformRenderer', file, String(origin + BigInt(step)), {
      parents: 32, expanded: 16, from: String(origin + BigInt(from)), to: String(origin + BigInt(to))
    });
    await wait(async () => (await state()).find(d => d.file === file)?.profile?.samples.length > count);
    const sample = (await state()).find(d => d.file === file).profile.samples.at(-1);
    assert.equal(sample.visible, true); assert.equal(sample.rows.length, 32); assert.equal(sample.details.parentRows, 32); assert.equal(sample.details.bitRows.length, 128);
    assert.equal(sample.details.from, String(origin + BigInt(from))); assert.equal(sample.details.to, String(origin + BigInt(to)));
    assert.equal(sample.details.denseRows > 0, denseExpected);
    for (const row of sample.rows) assert.equal(row.value, value(Number(row.id), step));
    for (const row of sample.details.bitRows) assert.equal(row.value, value(Number(row.parent), step)[7 - Number(row.offset)]);
    assert.ok(sample.hostTiming && sample.hostTiming.queueMs >= 0 && sample.hostTiming.windowMs >= 0);
    report.cases.push({ name, file, sample });
  }
  async function reload(file: string, name: string) {
    const previous = (await state()).find(d => d.file === file).profile;
    const old = previous.nonce, oldSample = previous.samples.at(-1), before = readers.length;
    await vscode.commands.executeCommand('rtl.probeWaveformRenderer', file, String(origin + 2n), { reload: true });
    await wait(async () => { const profile = (await state()).find(d => d.file === file)?.profile; return !!profile && profile.nonce !== old && profile.samples.some((s: any) => s.visible && s.details.bitRows.length === 128); });
    assert.equal(readers.length, before + 1);
    const sample = (await state()).find(d => d.file === file).profile.samples.at(-1);
    assert.equal(sample.details.parentRows, 32); assert.equal(sample.details.bitRows.length, 128);
    assert.equal(sample.cursor, oldSample.cursor); assert.deepEqual(sample.rows, oldSample.rows); assert.deepEqual(sample.details, oldSample.details);
    report.cases.push({ name, file, sample, nonceChanged: true });
  }
  try {
    await phase('open-medium', async () => { await vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(medium), 'rtl.waveform'); await wait(async () => (await state()).find(d => d.file === medium)?.profile?.samples.length > 0); });
    await phase('medium-max-rows', () => probe(medium, 'medium-max-rows', 1, 0, 191, false));
    await phase('medium-zoom', () => probe(medium, 'medium-zoom', 2, 0, 16, false));
    await phase('medium-reload', () => reload(medium, 'medium-reload'));
    await phase('open-dense-peer', async () => { await vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(dense), 'rtl.waveform'); await wait(async () => (await state()).find(d => d.file === dense)?.profile?.samples.length > 0); });
    await phase('dense-max-rows', () => probe(dense, 'dense-max-rows', 1, 0, 4095, true));
    for (const step of [3, 17, 18]) await phase(`dense-cursor-${step}`, () => probe(dense, `dense-cursor-${step}`, step, 0, 4095, true));
    await phase('dense-zoom', () => probe(dense, 'dense-zoom', 2, 0, 32, false));
    await phase('dense-reload', () => reload(dense, 'dense-reload'));
    await phase('medium-reactivate', async () => { await vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(medium), 'rtl.waveform'); await probe(medium, 'medium-peer-preserved', 18, 16, 32, false); });
    await phase('close-medium', async () => { await vscode.window.tabGroups.close(tabs().find(t => (t.input as vscode.TabInputCustom).uri.fsPath === medium)!); await wait(() => readers[1].exited); });
    assert.equal(readers[3].exited, false);
    await phase('dense-peer-preserved', async () => { await vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(dense), 'rtl.waveform'); await probe(dense, 'dense-peer-preserved', 35, 32, 48, false); });
    await phase('burst-latest', async () => {
      const started = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => { windowStarted = undefined; reject(Error('Burst request did not start')); }, 5000);
        windowStarted = () => { clearTimeout(timeout); resolve(); };
      });
      const trigger = vscode.commands.executeCommand('rtl.probeWaveformRenderer', dense, String(origin + 70n), { from: String(origin), to: String(origin + 4095n) });
      await started; assert.ok(pendingWindows > 0); report.burstSawInFlight = true;
      await Promise.all(Array.from({ length: 20 }, (_, index) => vscode.commands.executeCommand('rtl.probeWaveformRenderer', dense, String(origin + BigInt(100 + index)))));
      await trigger;
      await wait(async () => (await state()).find(d => d.file === dense)?.profile?.samples.some((s: any) => s.cursor === String(origin + 119n)));
      const sample = (await state()).find(d => d.file === dense).profile.samples.at(-1);
      assert.equal(sample.cursor, String(origin + 119n)); assert.equal(sample.details.bitRows.length, 128);
      for (const row of sample.rows) assert.equal(row.value, value(Number(row.id), 119));
      for (const row of sample.details.bitRows) assert.equal(row.value, value(Number(row.parent), 119)[7 - Number(row.offset)]);
      report.cases.push({ name: 'burst-latest', sample });
    });
    await phase('close-dense', async () => { await vscode.window.tabGroups.close(tabs().find(t => (t.input as vscode.TabInputCustom).uri.fsPath === dense)!); await wait(() => readers.every(r => r.exited)); });
    await phase('reload-close-recover', async () => {
      for (const file of [medium, dense]) {
        await vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(file), 'rtl.waveform');
        await wait(async () => (await state()).find(d => d.file === file)?.profile?.samples.length > 0);
      }
      await vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(medium), 'rtl.waveform');
      await vscode.commands.executeCommand('rtl.probeWaveformRenderer', medium, String(origin + 2n), { reload: true });
      await wait(() => readers.length === 7 && readers[6].loading);
      assert.equal(await vscode.window.tabGroups.close(tabs().find(t => (t.input as vscode.TabInputCustom).uri.fsPath === medium)!), true);
      await wait(async () => readers[6].exited && !(await state()).some(d => d.file === medium));
      assert.equal(readers[5].exited, false); report.reloadClosedWhileLoading = true;
      await vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(dense), 'rtl.waveform');
      await probe(dense, 'cancel-peer-preserved', 2, 0, 32, false);
      await vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(medium), 'rtl.waveform');
      await wait(async () => (await state()).find(d => d.file === medium)?.profile?.samples.length > 0);
      await probe(medium, 'cancelled-reopen', 18, 16, 32, false);
      for (const tab of tabs()) await vscode.window.tabGroups.close(tab);
      await wait(() => readers.every(r => r.exited));
      report.cancelReopenRecovered = true;
    });
    assert.equal(readers.length, 8); assert.equal((await state()).length, 0);
    assert.deepEqual(await Promise.all([medium, dense].map(hash)), hashes);
    report.sourceHashPreserved = true; report.passed = true;
  } catch (error) { report.error = String(error); throw error; }
  finally {
    for (const tab of tabs()) await vscode.window.tabGroups.close(tab);
    for (const reader of readers) if (!reader.exited) await reader.worker.terminate();
    threads.Worker = NativeWorker; clearInterval(poll); loop.disable();
    report.startedWorkers = readers.length; report.exitedWorkers = readers.filter(r => r.exited).length; report.peakRss = peakRss;
    report.afterMemory = process.memoryUsage();
    report.notes.push('Payload JSON/structuredClone timings are post-lifecycle local proxies, not VS Code transport implementation or pure IPC. Two retained diagnostic payloads affect RSS.');
    try { report.payloadBenchmarks = [...payloadFixtures].map(([kind, result]) => {
      const stringifyMs: number[] = [], parseMs: number[] = [], cloneMs: number[] = [];
      let bytes = 0;
      for (let i = 0; i < 5; i++) {
        let start = performance.now(); const json = JSON.stringify(result); stringifyMs.push(performance.now() - start);
        bytes = Buffer.byteLength(json);
        start = performance.now(); const parsed = JSON.parse(json); parseMs.push(performance.now() - start);
        start = performance.now(); const cloned = structuredClone(result); cloneMs.push(performance.now() - start);
        assert.deepEqual(parsed, result); assert.deepEqual(cloned, result);
      }
      return { kind, bytes, rows: result.rows.length, buckets: result.rows.reduce((n: number, r: any) => n + (r.buckets?.length ?? 0), 0),
        changes: result.rows.reduce((n: number, r: any) => n + r.changes.length, 0), stringifyMs, parseMs, cloneMs };
    }); } catch (error) { report.passed = false; report.error = String(error); throw error; }
    finally { await writeFile(path.join(root, '.rtl/extension-test.json'), JSON.stringify(report, null, 2)); }
  }
}
