import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { Worker } from 'node:worker_threads';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';

test('opt-in worker timings preserve raw metadata, verified identity and query results', async () => {
  const base = path.resolve('.dev/tests'); await mkdir(base, { recursive: true });
  const root = await mkdtemp(path.join(base, 'wave-profile-')), script = path.join(root, 'worker.cjs'), file = path.join(root, '파형 space.vcd');
  const text = '$timescale 1ns $end $scope module tb $end $var wire 2 ! state $end $upscope $end $enddefinitions $end #0 b01 ! #10 bzz !';
  const bytes = Buffer.from(text), sha256 = createHash('sha256').update(bytes).digest('hex');
  await writeFile(file, text);
  await build({ entryPoints: ['packages/waveform/src/worker.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: script });
  const worker = new Worker(script); let id = 0;
  const send = (message: any) => new Promise<any>((resolve, reject) => {
    const request = ++id, timer = setTimeout(() => { worker.off('message', listener); reject(Error('Worker profiling timed out')); }, 10000);
    const listener = (reply: any) => { if (reply.id !== request) return; clearTimeout(timer); worker.off('message', listener); resolve(reply); };
    worker.on('message', listener); worker.postMessage({ ...message, id: request });
  });
  try {
    const ordinary = await send({ kind: 'load', file }); assert.equal(ordinary.profile, undefined);
    const profiled = await send({ kind: 'load', file, profile: true }); assert.deepEqual(profiled.result, ordinary.result);
    for (const key of ['openMs', 'statMs', 'allocateMs', 'readMs', 'restatMs', 'decodeMs', 'parseMs', 'closeMs', 'totalMs']) {
      assert.ok(Number.isFinite(profiled.profile[key]) && profiled.profile[key] >= 0, key);
    }
    assert.ok(profiled.profile.totalMs >= profiled.profile.parseMs);
    const verified = await send({ kind: 'loadVerified', bytes, sha256, profile: true });
    assert.equal(verified.result.sha256, sha256); assert.deepEqual(verified.result.metadata, ordinary.result); assert.ok(verified.profile.hashMs >= 0);
    const values = await send({ kind: 'values', request: { signals: ['0'], cursor: '10' } });
    assert.equal(values.result.rows[0].value, 'zz'); assert.equal(values.profile, undefined);
    const windowRequest = { signals: ['0'], cursor: '10', from: '0', to: '10', pixels: 16 };
    const ordinaryWindow = await send({ kind: 'window', request: windowRequest }); assert.equal(ordinaryWindow.profile, undefined);
    const timedWindow = await send({ kind: 'window', request: windowRequest, profile: true });
    assert.deepEqual(timedWindow.result, ordinaryWindow.result);
    assert.ok(Number.isFinite(timedWindow.profile.queryMs) && timedWindow.profile.queryMs >= 0);
    assert.ok(timedWindow.profile.totalMs >= timedWindow.profile.queryMs);
    const bad = await send({ kind: 'loadVerified', bytes, sha256: '0'.repeat(64), profile: true });
    assert.match(bad.error, /hash/); assert.ok(bad.profile.hashMs >= 0); assert.equal(bad.result, undefined);
    const unready = await send({ kind: 'values', request: { signals: ['0'], cursor: '10' } }); assert.match(unready.error, /not loaded/);
  } finally { await worker.terminate(); }
});
