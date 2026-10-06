import test from 'node:test';
import assert from 'node:assert/strict';
import { queryWindow, type WaveData } from '@rtl-dev/waveform';

test('dense shared boundaries match a linear oracle including repeated boundary ticks, aliases and X/Z', () => {
  for (const span of [3n, 413n]) for (const pixels of [1, 16, 1600]) {
    const from = 9007199254740993n, to = from + span;
    const changes = Array.from({ length: 4000 }, (_, index) => ({ time: String(from + BigInt(index) * span / 4000n), value: index % 7 === 0 ? 'x' : index % 7 === 1 ? 'z' : String(index % 2) }));
    const data: WaveData = { signals: [{ id: '0', code: '!', path: 'a', scope: '', name: 'a', width: 1, type: 'wire' }, { id: '1', code: '!', path: 'alias', scope: '', name: 'alias', width: 1, type: 'wire' }],
      channels: new Map([['!', changes]]), timescale: { magnitude: 1, unit: 'ps' }, end: String(to), changes: changes.length, warnings: [] };
    const result = queryWindow(data, { signals: ['0', '1'], cursor: String(from + 1n), from: String(from), to: String(to), pixels });
    assert.deepEqual(result.rows[0].buckets, result.rows[1].buckets);
    if (!result.rows[0].dense) {
      assert.deepEqual(result.rows[0].changes, changes.filter(change => BigInt(change.time) > from && BigInt(change.time) <= to));
      continue;
    }
    const bucketCount = result.rows[0].buckets!.length;
    const oracle = Array.from({ length: bucketCount }, (_, index) => {
      const left = from + span * BigInt(index) / BigInt(bucketCount), right = from + span * BigInt(index + 1) / BigInt(bucketCount);
      const before = changes.filter(change => BigInt(change.time) <= left), after = changes.filter(change => BigInt(change.time) <= right);
      return { from: String(left), to: String(right), value: after.at(-1)?.value ?? 'x', edges: after.length - before.length };
    });
    assert.deepEqual(result.rows[0].buckets, oracle);
  }
});
