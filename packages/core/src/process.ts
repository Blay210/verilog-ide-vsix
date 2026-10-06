import { spawn } from 'node:child_process';
import type { OperationContext, ProcessResult, ProcessSpec } from './model';

export class ProcessFailure extends Error {
  constructor(message: string, readonly cancelled = false) { super(message); }
}

export async function runProcess(spec: ProcessSpec, context: OperationContext = {}): Promise<ProcessResult> {
  if (context.signal?.aborted) throw new ProcessFailure('Cancelled', true);
  return new Promise((resolve, reject) => {
    let output = '', cancelled = false, settled = false;
    const child = spawn(spec.executable, spec.args, { cwd: spec.cwd, env: spec.env ?? process.env, shell: false, windowsHide: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    const append = (chunk: string) => { output = (output + chunk).slice(-65536); context.onLog?.(chunk); };
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', append); child.stderr.on('data', append);
    let killing: Promise<void> | undefined;
    const abort = () => {
      if (settled || killing) return;
      cancelled = true;
      killing = new Promise<void>(done => {
        if (!child.pid) { done(); return; }
        if (process.platform === 'win32') {
          const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
          killer.on('error', () => { child.kill(); done(); });
          killer.on('close', code => { if (code !== 0) child.kill(); done(); });
        } else {
          try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
          done();
        }
      });
    };
    context.signal?.addEventListener('abort', abort, { once: true });
    if (context.signal?.aborted) abort();
    const cleanup = () => { settled = true; context.signal?.removeEventListener('abort', abort); };
    child.on('error', error => { cleanup(); reject(new ProcessFailure(`Could not start ${spec.executable}: ${error.message}`, cancelled)); });
    child.on('close', async code => { await killing; cleanup(); resolve({ code, output, cancelled }); });
  });
}

export async function checkedProcess(spec: ProcessSpec, context: OperationContext = {}): Promise<string> {
  const result = await runProcess(spec, context);
  if (result.cancelled) throw new ProcessFailure('Cancelled', true);
  if (result.code !== 0) throw new ProcessFailure(`Process exited with ${result.code}: ${result.output.trim()}`);
  return result.output;
}
