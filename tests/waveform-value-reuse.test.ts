import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVcd, queryValues } from '@rtl-dev/waveform';

test('entry/character saturation and wide-value bypass retain every transition across independent parses', () => {
  for (const [width, count] of [[13, 5000], [64, 1100], [65, 100]]) {
    const origin = 9007199254740993n;
    const header = `$timescale 1 ps $end $scope module t $end $var wire ${width} ! data $end $var wire ${width} ! alias $end $upscope $end $enddefinitions $end `;
    const body = Array.from({ length: count }, (_, index) => `#${origin + BigInt(index)} b${index.toString(2)} !`).join(' ');
    const first = parseVcd(header + body), second = parseVcd(header + body);
    assert.equal(first.changes, count); assert.deepEqual(second, first);
    for (const index of [0, 1024, 4096, count - 1].filter(index => index < count)) {
      const value = index.toString(2).padStart(width, '0');
      assert.deepEqual(queryValues(first, { signals: ['0', '1'], cursor: String(origin + BigInt(index)) }).rows.map(row => row.value), [value, value]);
    }
  }
});

test('normalized four-state reuse preserves real spelling, widths and final same-tick values', () => {
  const text = '$timescale 1 ns $end $scope module t $end $var wire 8 ! bus $end $var wire 1 ? bit $end $var real 64 # analog $end $upscope $end $enddefinitions $end '
    + '#0 bX ! X? r1.00 # #1 bZ ! Z? r1e0 # #2 b1 ! 1? r-0.0 # #2 bZ ! Z? #3 b1 ! 1?';
  const data = parseVcd(text);
  assert.deepEqual(data.channels.get('!'), [{ time: '0', value: 'xxxxxxxx' }, { time: '1', value: 'zzzzzzzz' }, { time: '3', value: '00000001' }]);
  assert.deepEqual(data.channels.get('?'), [{ time: '0', value: 'x' }, { time: '1', value: 'z' }, { time: '3', value: '1' }]);
  assert.deepEqual(data.channels.get('#')?.map(change => change.value), ['1.00', '1e0', '-0.0']);
  assert.throws(() => parseVcd(text + ' #4 b2 !'), /Invalid/);
});
