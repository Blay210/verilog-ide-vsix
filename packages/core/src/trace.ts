import path from 'node:path';
import { open, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { TestResult, TraceIdentity } from './model';
import { loadRecordedInputs } from './snapshot';
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const ready = z.object({version:z.literal(1),state:z.literal('ready'),runId:z.string().uuid(),inputFingerprint:hash,
  format:z.enum(['vcd','fst']),file:z.string().min(1),sha256:hash,bytes:z.number().int().nonnegative().max(128*1024*1024)}).strict();
export function parseTraceIdentity(value: unknown): TraceIdentity | undefined {
  if (value === undefined) return undefined;
  const parsed = z.union([ready,z.object({version:z.literal(1),state:z.literal('unavailable'),reason:z.string()}).strict()]).safeParse(value);
  return parsed.success ? parsed.data : {version:1,state:'unavailable',reason:'Unsupported or damaged trace identity.'};
}
const equal = (a:string,b:string) => process.platform==='win32' ? path.resolve(a).toLowerCase()===path.resolve(b).toLowerCase() : path.resolve(a)===path.resolve(b);
/** Hash/read the same bounded bytes, rejecting symlinks and ordinary concurrent edits. */
async function artifact(file:string,limit:number,retain:boolean,signal?:AbortSignal) {
  signal?.throwIfAborted();
  const before=await lstat(file);
  if (!before.isFile() || before.isSymbolicLink() || before.size>limit) throw Error('Invalid or oversized recorded waveform.');
  const handle=await open(file,'r');
  try {
    const initial=await handle.stat();
    if (initial.ino!==before.ino || initial.dev!==before.dev) throw Error('Waveform replaced while opening.');
    const digest=createHash('sha256'),chunks:Buffer[]=[];let bytes=0;
    while(true) {
      signal?.throwIfAborted();const chunk=Buffer.allocUnsafe(65536),read=await handle.read(chunk);
      if (!read.bytesRead) break;
      bytes+=read.bytesRead;if(bytes>limit)throw Error('Recorded waveform size limit exceeded.');
      const part=chunk.subarray(0,read.bytesRead);digest.update(part);if(retain)chunks.push(part);
    }
    const after=await handle.stat(),current=await lstat(file);
    if(current.isSymbolicLink() || current.ino!==initial.ino || current.dev!==initial.dev || bytes!==initial.size ||
      after.size!==initial.size || after.mtimeMs!==initial.mtimeMs || current.mtimeMs!==initial.mtimeMs)
      throw Error('Waveform changed while being read.');
    return {bytes,sha256:digest.digest('hex'),content:retain?Buffer.concat(chunks):undefined};
  } finally {await handle.close();}
}
function fileFor(result:TestResult,name:string) {
  if (!result.waveform || path.basename(name)!==name || name==='.' || name==='..' || !equal(path.join(result.directory,name),result.waveform))
    throw Error('Waveform does not belong to the recorded run directory.');
  return result.waveform;
}
export async function captureTraceIdentity(result:TestResult,format:'vcd'|'fst',signal?:AbortSignal):Promise<TraceIdentity> {
  try {
    const saved=await loadRecordedInputs(result,signal);
    const name=path.basename(result.waveform??'');
    if (!name.endsWith('.'+format) || saved.project.waveform!==format) throw Error('Recorded waveform format mismatch.');
    const observed=await artifact(fileFor(result,name),128*1024*1024,false,signal);
    return {version:1,state:'ready',runId:saved.runId,inputFingerprint:saved.identity.fingerprint!,format,file:name,sha256:observed.sha256,bytes:observed.bytes};
  } catch(error) {return {version:1,state:'unavailable',reason:String(error)};}
}
/** Legacy/unsupported artifacts remain viewable but cannot authorize structure values. */
export async function loadRecordedTrace(result:TestResult,signal?:AbortSignal) {
  const parsed=parseTraceIdentity(result.traceIdentity);
  if(parsed?.state!=='ready')throw Error(parsed?.reason??'No recorded trace identity. Older waveforms remain viewable but cannot be bound to structure.');
  const identity=ready.parse(parsed);
  const saved=await loadRecordedInputs(result,signal);
  if(identity.runId!==saved.runId || identity.inputFingerprint!==saved.identity.fingerprint)throw Error('Trace/source run identity mismatch.');
  if(identity.format!=='vcd')throw Error('Recorded structure trace mapping currently supports VCD only; FST remains available externally.');
  if(saved.project.waveform!==identity.format || !identity.file.endsWith('.vcd'))throw Error('Trace format mismatch.');
  const file=fileFor(result,identity.file),observed=await artifact(file,32*1024*1024,true,signal);
  if(observed.sha256!==identity.sha256 || observed.bytes!==identity.bytes)throw Error('Recorded waveform content was modified.');
  return {runId:saved.runId,inputFingerprint:identity.inputFingerprint,file,sha256:identity.sha256,bytes:observed.content!};
}
