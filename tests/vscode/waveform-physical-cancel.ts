import * as vscode from 'vscode';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

/** Isolated physical-input harness: delay one dispatch, never synthesize cancellation. */
export async function testPhysicalWaveformCancel(): Promise<void> {
  const root = vscode.workspace.workspaceFolders![0].uri.fsPath;
  const repository = path.resolve(vscode.extensions.getExtension('rtl-dev-local.rtl-dev')!.extensionPath, '../..');
  const output = path.join(root, '.rtl'); await mkdir(output, { recursive: true });
  const baseline = JSON.parse(await readFile(path.join(repository, '.dev/waveform-scale-latest.json'), 'utf8'));
  const bytes = await readFile(path.join(baseline.root, 'signals-4096-steps-192.vcd'));
  const hash = (value: Buffer) => createHash('sha256').update(value).digest('hex');
  const sha = hash(bytes), peerFile = path.join(output, 'cancel-peer.vcd'), targetFile = path.join(output, 'cancel-target.vcd');
  await writeFile(peerFile, bytes); await writeFile(targetFile, bytes);
  const threads = require('node:worker_threads') as typeof import('node:worker_threads');
  const NativeWorker = threads.Worker;
  const readers: { worker: import('node:worker_threads').Worker; exited: boolean; held: boolean }[] = [];
  let delayNext = true;
  threads.Worker = class extends NativeWorker {
    constructor(file: any, options?: any) {
      super(file, options);
      if (!String(file).endsWith('waveform-worker.cjs')) return;
      const record = { worker: this, exited: false, held: false }; readers.push(record);
      let timer: ReturnType<typeof setTimeout> | undefined;
      const post = this.postMessage.bind(this);
      this.postMessage = ((message: any, ...rest: any[]) => {
        if (delayNext && message.kind === 'load' && message.file === targetFile) {
          delayNext = false; record.held = true;
          // A bounded diagnostic dispatch delay exposes the real progress button.
          // Actual UI cancellation terminates this real worker and clears the timer.
          timer = setTimeout(() => { record.held = false; (post as any)(message, ...rest); }, 20000);
          return;
        }
        return (post as any)(message, ...rest);
      }) as typeof this.postMessage;
      this.once('exit', () => { clearTimeout(timer); record.exited = true; });
    }
  };
  const states = () => vscode.commands.executeCommand<any[]>('rtl.getWaveformState');
  const wait = async (check: () => boolean | Promise<boolean>, timeout = 15000) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 50)); }
    throw Error('Physical cancel harness observation timed out');
  };
  const tabs = () => vscode.window.tabGroups.all.flatMap(group => group.tabs).filter(tab =>
    tab.input instanceof vscode.TabInputCustom && [peerFile, targetFile].includes(tab.input.uri.fsPath));
  const value = (worker: import('node:worker_threads').Worker) => new Promise<any>((resolve, reject) => {
    const id = 1000000001;
    const listener = (message: any) => { if (message.id !== id) return; clearTimeout(timer); worker.off('message', listener); message.error ? reject(Error(message.error)) : resolve(message.result); };
    const timer = setTimeout(() => { worker.off('message', listener); reject(Error('Peer value query timed out')); }, 5000);
    worker.on('message', listener); worker.postMessage({ id, kind: 'values', request: { signals: ['0'], cursor: '9007199254740994' } });
  });
  const report: any = { passed: false, physicalInputRequired: true, dispatchDelayMs: 20000, synthetic: true };
  try {
    await vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(peerFile), 'rtl.waveform');
    const peer = readers[0]; assert.equal((await value(peer.worker)).rows[0].value, 'zzzzzzzz');
    await writeFile(path.join(output, 'cancel-physical-ready.json'), JSON.stringify({ stage: 'ready-to-start', targetFile, peerFile }));
    await wait(async () => { try { return JSON.parse(await readFile(path.join(output, 'cancel-physical-start.json'), 'utf8')).start === true; } catch { return false; } }, 180000);
    const started = Date.now();
    const pending = vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(targetFile), 'rtl.waveform').then(() => ({ opened: true }), error => ({ error: String(error) }));
    await wait(() => readers.some(reader => reader.held));
    const target = readers.find(reader => reader.held)!;
    await writeFile(path.join(output, 'cancel-physical-ready.json'), JSON.stringify({ stage: 'click-progress-cancel', targetFile, peerFile, started }));
    await wait(() => target.exited, 18000);
    const elapsedMs = Date.now() - started;
    assert.ok(elapsedMs < 20000 && target.held, 'Cancel must occur before delayed dispatch/normal timeout');
    report.cancelledOpen = await pending; report.cancelElapsedMs = elapsedMs;
    await wait(async () => !(await states()).some(document => document.file === targetFile));
    assert.equal(peer.exited, false); assert.equal((await value(peer.worker)).rows[0].value, 'zzzzzzzz');
    report.peerPreserved = true; report.cancelledDocumentRemoved = true;
    await vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(targetFile), 'rtl.waveform');
    const reopened = (await states()).find(document => document.file === targetFile);
    assert.equal(reopened.metadata.signals.length, 4096); assert.equal(reopened.metadata.changes, 786432);
    assert.equal((await value(readers.at(-1)!.worker)).rows[0].value, 'zzzzzzzz'); report.retryPassed = true;
    await writeFile(path.join(output, 'cancel-physical-ready.json'), JSON.stringify({ stage: 'retry-ready', targetFile, peerFile }));
    // Allow observation of the successful retry; the observer only acknowledges it.
    await wait(async () => { try { return JSON.parse(await readFile(path.join(output, 'cancel-physical-finish.json'), 'utf8')).finish === true; } catch { return false; } }, 180000);
    for (const tab of tabs()) await vscode.window.tabGroups.close(tab);
    await wait(() => readers.every(reader => reader.exited));
    assert.equal(hash(await readFile(peerFile)), sha); assert.equal(hash(await readFile(targetFile)), sha);
    report.sourceHashPreserved = true; report.passed = true;
  } catch (error) { report.error = String(error); throw error; }
  finally {
    for (const tab of tabs()) await vscode.window.tabGroups.close(tab);
    await Promise.all(readers.filter(reader => !reader.exited).map(reader => reader.worker.terminate()));
    threads.Worker = NativeWorker;
    report.startedWorkers = readers.length; report.exitedWorkers = readers.filter(reader => reader.exited).length;
    await writeFile(path.join(output, 'extension-test.json'), JSON.stringify(report, null, 2));
  }
}
