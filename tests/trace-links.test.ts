import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { parseVcd } from '@rtl-dev/waveform';

const compiled = build({ entryPoints: ['packages/vscode/src/trace-links.ts'], bundle: true, platform: 'node', format: 'cjs', write: false, external: ['@rtl-dev/core', '@rtl-dev/waveform/client'] });
const metadata = parseVcd('$timescale 1 ps $end $scope module tb $end $var wire 1 ! clk $end $upscope $end $enddefinitions $end #0 0! #10 1!');
const record = (id = '00000000-0000-4000-8000-000000000001', root = 'D:/fixture') => ({ runId: id, directory: `${root}/.rtl/runs/${id}`, waveform: `${root}/.rtl/runs/${id}/wave.vcd`, traceIdentity: { state: 'ready' } });
async function fixture() {
  const readers: any[] = [], records = new Map<string, any>(); let damaged = false, pause: (() => Promise<void>) | undefined, validations = 0;
  const mocks: Record<string, any> = {
    '@rtl-dev/core': {
      loadRecordedTrace: async (r: any, signal: AbortSignal) => { signal.throwIfAborted(); if (damaged) throw Error('Trace modified'); return { runId: r.runId, inputFingerprint: 'a'.repeat(64), sha256: 'b'.repeat(64), bytes: Buffer.from('verified') }; },
      loadRecordedInputs: async (_: any, signal: AbortSignal) => { validations++; signal.throwIfAborted(); if (damaged) throw Error('Inputs modified'); },
      readHistory: async (root: string) => records.get(root) ?? []
    },
    '@rtl-dev/waveform/client': { WaveformSession: class {
      disposed = false; constructor() { readers.push(this); }
      async loadVerified(bytes: Buffer, hash: string) { assert.equal(bytes.toString(), 'verified'); await pause?.(); return { metadata, sha256: hash, bytes: bytes.length }; }
      async values(request: any) { if (this.disposed) throw Error('Reader disposed'); return { cursor: request.cursor, rows: [{ id: '0', value: request.cursor === '10' ? '1' : '0' }] }; }
      async dispose() { this.disposed = true; }
    } }
  };
  const module = { exports: {} as any }, require = createRequire(import.meta.url);
  vm.runInNewContext((await compiled).outputFiles[0].text, { module, exports: module.exports, require: (id: string) => mocks[id] ?? require(id), process, AbortController, setTimeout, clearTimeout });
  const links = new module.exports.RecordedTraceLinks('worker');
  return { links, readers, records, validations: () => validations, damage: () => { damaged = true; }, pause: (gate: () => Promise<void>) => { pause = gate; } };
}

test('recorded trace host consumes verified bytes, shares only pinned runs and invalidates peer workers', async () => {
  const f = await fixture(), a = record(), updates: any[] = [];
  const diagram = await f.links.open(a), wave = await f.links.open(a);
  wave.subscribe((state: any) => updates.push(state));
  const other = await f.links.open(record('00000000-0000-4000-8000-000000000002'));
  diagram.set('10'); assert.equal(wave.read().time, '10'); assert.equal(other.read().time, '0');
  assert.equal((await wave.values({ signals: ['0'], cursor: '10' })).rows[0].value, '1');
  f.links.changed(a.waveform); assert.equal(wave.read().state, 'unavailable'); assert.equal(other.read().state, 'ready');
  assert.ok(f.readers[0].disposed && f.readers[1].disposed); assert.equal(updates.at(-1).state, 'unavailable');
  await assert.rejects(wave.values({ signals: ['0'], cursor: '0' }), /verified/);
  assert.throws(() => diagram.set('0'), /verified/); assert.equal(f.validations(), 3);
  const reopened = await f.links.open(a); assert.equal(reopened.read().state, 'ready');
  diagram.dispose(); wave.dispose(); assert.equal(reopened.read().state, 'ready');
  f.links.changed('D:/fixture/.rtl'); assert.equal(reopened.read().state, 'unavailable'); assert.equal(other.read().state, 'unavailable');
  f.links.dispose(); assert.ok(f.readers.every(r => r.disposed)); await assert.rejects(f.links.open(a), /closed/);
});

test('file changes or cancellation during worker parsing cannot publish a ready trace', async () => {
  for (const cancel of ['file', 'signal', 'close']) {
    const f = await fixture(); let release!: () => void, entered!: () => void;
    const gate = new Promise<void>(r => { release = r; }), started = new Promise<void>(r => { entered = r; });
    f.pause(async () => { entered(); await gate; }); const abort = new AbortController();
    const recordValue = record(), pending = f.links.open(recordValue, abort.signal), rejected = assert.rejects(pending);
    await started;
    if (cancel === 'file') f.links.changed(recordValue.directory + '/inputs/design.sv');
    else if (cancel === 'signal') abort.abort(); else f.links.dispose();
    release(); await rejected; assert.ok(f.readers[0].disposed); f.links.dispose();
  }
});

test('unverified traces fail without worker creation; post-parse input damage disposes the worker', async () => {
  const f = await fixture(); await assert.rejects(f.links.open({ ...record(), traceIdentity: undefined }), /identity/); assert.equal(f.readers.length, 0);
  f.pause(async () => { f.damage(); }); await assert.rejects(f.links.open(record()), /Inputs modified/);
  assert.ok(f.readers[0].disposed); f.links.dispose();
});
