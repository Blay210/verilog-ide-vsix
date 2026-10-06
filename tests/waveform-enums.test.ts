import test from 'node:test';
import assert from 'node:assert/strict';
import { mapTraceEnums, parseVcd, formatEnumValue, parseView, type EnumTraceNode } from '@rtl-dev/waveform';

const root = (): EnumTraceNode => ({ id: 'tb', kind: 'instance', module: 'tb', instancePath: ['tb'], ports: [], children: [], enumSignals: [
  { name: 'state', width: 2, values: [{ name: 'IDLE', bits: '00' }, { name: 'LOAD', bits: '01' }, { name: 'DONE', bits: '11' }] }
] });
const data = (extra = '') => parseVcd(`$scope module TOP $end $scope module tb $end $var wire 2 ! state [1:0] $end $var wire 2 ! raw [1:0] $end ${extra} $upscope $end $upscope $end $enddefinitions $end #0 b00 ! #10 b01 !`);
test('enum mapping uses exact declarations, isolates aliases and preserves numeric/unknown fallback', () => {
  const wave = data(), labels = mapTraceEnums({ roots: [root()] }, wave.signals, 'tb');
  assert.equal(formatEnumValue('01', 'auto', labels['0']), 'LOAD');
  assert.equal(labels['1'], undefined, 'same channel with another declaration is not typed as enum');
  assert.equal(formatEnumValue('01', 'hex', labels['0']), '0x1');
  assert.equal(formatEnumValue('10', 'auto', labels['0']), '0x2');
  assert.equal(formatEnumValue('xx', 'auto', labels['0']), '0xX');
  assert.equal(formatEnumValue('zz', 'auto', labels['0']), '0xZ');
  assert.equal(formatEnumValue('1', 'auto', labels['0']), '1');
  assert.equal(formatEnumValue('01', 'binary', labels['0']), '01');
  assert.equal(formatEnumValue('01', 'auto', undefined), '0x1');
  assert.equal(parseView({ id: 'a', name: 'States', radix: 'auto', signals: [{ path: 'TOP.tb.state [1:0]', radix: 'auto' }] }).radix, 'auto');
});
test('enum mapping rejects width, ambiguous channels, duplicate encodings and mixed root interpretations', () => {
  let r = root(); r.enumSignals![0].width = 3;
  assert.equal(Object.keys(mapTraceEnums({ roots: [r] }, data().signals, 'tb')).length, 0);
  assert.equal(Object.keys(mapTraceEnums({ roots: [root()] }, data('$var wire 2 " state [1:0] $end').signals, 'tb')).length, 0);
  r = root(); r.enumSignals![0].values.push({ name: 'ALIAS', bits: '01' });
  assert.equal(Object.keys(mapTraceEnums({ roots: [r] }, data().signals, 'tb')).length, 0);
  const mixed = [...data().signals, ...data().signals.map(s => ({ ...s, id: 'other' + s.id, scopeSegments: ['tb'] }))];
  assert.equal(Object.keys(mapTraceEnums({ roots: [root()] }, mixed, 'tb')).length, 0);
  r = root(); r.children.push({ ...root(), module: undefined, id: 'other' });
  assert.equal(Object.keys(mapTraceEnums({ roots: [r] }, data().signals, 'tb')).length, 0);
});
