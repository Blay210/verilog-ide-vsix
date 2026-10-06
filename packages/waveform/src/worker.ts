import { parentPort } from 'node:worker_threads';
import { open } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { LIMITS, parseVcd, queryWindow, queryValues, adjacentChange, type WaveData } from './index';
let data: WaveData | undefined;
// Serialize file reads and queries so a slow earlier load cannot replace a later one.
let queue = Promise.resolve();
parentPort!.on('message', message => { queue = queue.then(() => handle(message)); });
async function handle(message: any) {
  const profiling = message.profile === true;
  const started = profiling ? performance.now() : 0;
  const phases: Record<string, number> = {};
  async function measured<T>(name: string, action: () => Promise<T>): Promise<T> {
    if (!profiling) return action();
    const start = performance.now(); try { return await action(); } finally { phases[name] = performance.now() - start; }
  }
  function measuredSync<T>(name: string, action: () => T): T {
    if (!profiling) return action();
    const start = performance.now(); try { return action(); } finally { phases[name] = performance.now() - start; }
  }
  try {
    let result: unknown;
    if (message.kind === 'loadVerified') {
      data = undefined;
      if (!(message.bytes instanceof Uint8Array) || message.bytes.buffer instanceof SharedArrayBuffer || message.bytes.byteLength > LIMITS.bytes || typeof message.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(message.sha256)) throw Error('Invalid verified waveform input (maximum 32 MiB, no shared memory).');
      const buffer = Buffer.from(message.bytes.buffer, message.bytes.byteOffset, message.bytes.byteLength);
      const sha256 = measuredSync('hashMs', () => createHash('sha256').update(buffer).digest('hex'));
      if (sha256 !== message.sha256) throw Error('Verified waveform bytes do not match the recorded trace hash.');
      const text = measuredSync('decodeMs', () => buffer.toString('utf8'));
      data = measuredSync('parseMs', () => parseVcd(text));
      const { channels, ...metadata } = data;
      result = { metadata, sha256, bytes: buffer.byteLength };
    } else if (message.kind === 'load') {
      data = undefined;
      const file = await measured('openMs', () => open(message.file, 'r'));
      try {
        const info = await measured('statMs', () => file.stat());
        if (!info.isFile() || info.size > LIMITS.bytes) throw Error('Built-in viewer supports VCD files up to 32 MiB. Use GTKWave for larger files.');
        // Bounded read even if the producer is still growing the file.
        const buffer = measuredSync('allocateMs', () => Buffer.alloc(info.size + 1)); let offset = 0;
        await measured('readMs', async () => {
          while (offset < buffer.length) { const read = await file.read(buffer, offset, buffer.length - offset, offset); if (!read.bytesRead) break; offset += read.bytesRead; }
        });
        const after = await measured('restatMs', () => file.stat());
        if (offset !== info.size || after.size !== info.size || after.mtimeMs !== info.mtimeMs) throw Error('Waveform changed while reading. Wait for simulation to finish and reopen.');
        const text = measuredSync('decodeMs', () => buffer.subarray(0, offset).toString('utf8'));
        data = measuredSync('parseMs', () => parseVcd(text));
        const { channels, ...metadata } = data; result = metadata;
      } finally { await measured('closeMs', () => file.close()); }
    } else {
      if (!data) throw Error('Waveform is not loaded.');
      if (message.kind === 'window') result = measuredSync('queryMs', () => queryWindow(data!, message.request));
      else if (message.kind === 'values') result = queryValues(data, message.request);
      else if (message.kind === 'edge') result = adjacentChange(data, message.signal, message.time, message.direction);
      else throw Error('Unknown waveform request.');
    }
    parentPort!.postMessage({ id: message.id, result, ...(profiling ? { profile: { ...phases, totalMs: performance.now() - started } } : {}) });
  } catch (error) { parentPort!.postMessage({ id: message.id, error: String(error), ...(profiling ? { profile: { ...phases, totalMs: performance.now() - started } } : {}) }); }
}
