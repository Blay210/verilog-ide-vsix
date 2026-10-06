import { Worker } from 'node:worker_threads';
import { LIMITS, type WaveMetadata, type WindowRequest, type WaveWindow, type VerifiedWaveMetadata, type ValuesRequest, type WaveValues } from './model';
/** One bounded, disposable reader per document. No native executables or editor API. */
export class WaveformSession {
  private worker: Worker;
  private sequence = 0;
  private closed = false;
  private disposal: Promise<void> | undefined;
  private pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
  constructor(workerFile: string) {
    this.worker = new Worker(workerFile, { resourceLimits: { maxOldGenerationSizeMb: 256 } });
    this.worker.on('message', message => { const job = this.pending.get(message.id); this.pending.delete(message.id); if (message.error) job?.reject(Error(message.error)); else job?.resolve(message.result); });
    this.worker.on('error', error => this.close(error));
    this.worker.on('exit', () => this.close(Error('Waveform reader closed.')));
  }
  private close(error: Error) { this.closed = true; for (const job of this.pending.values()) job.reject(error); this.pending.clear(); }
  private request<T>(message: object): Promise<T> {
    if (this.closed) return Promise.reject(Error('Waveform reader closed.'));
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      try { this.worker.postMessage({ ...message, id }); }
      catch (error) { this.pending.delete(id); reject(error); }
    });
  }
  load(file: string): Promise<WaveMetadata> { return this.request({ kind: 'load', file }); }
  /** Pass Core's verified bytes. The worker hashes its own copy before parsing.
   * Caller must separately validate recorded inputs/run context; this is not authorization.
   */
  loadVerified(bytes: Uint8Array, sha256: string): Promise<VerifiedWaveMetadata> {
    if (!(bytes instanceof Uint8Array) || bytes.buffer instanceof SharedArrayBuffer || bytes.byteLength > LIMITS.bytes || !/^[a-f0-9]{64}$/.test(sha256)) return Promise.reject(Error('Invalid verified waveform input (maximum 32 MiB, no shared memory).'));
    return this.request({ kind: 'loadVerified', bytes, sha256 });
  }
  values(request: ValuesRequest): Promise<WaveValues> { return this.request({ kind: 'values', request }); }
  window(request: WindowRequest): Promise<WaveWindow> { return this.request({ kind: 'window', request }); }
  edge(signal: string, time: string, direction: number): Promise<string | undefined> { return this.request({ kind: 'edge', signal, time, direction }); }
  dispose(): Promise<void> {
    // Closing requests and finishing worker termination are distinct. Every
    // caller must await the same termination, including an error/abort race.
    if (!this.disposal) {
      this.close(Error('Waveform loading cancelled.'));
      this.disposal = this.worker.terminate().then(() => undefined);
    }
    return this.disposal;
  }
}
