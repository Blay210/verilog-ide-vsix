import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { parseViewBook, putView, deleteView, resolveView, retainMissing, parseVcd, type WaveView } from '@rtl-dev/waveform';
import { createProject } from '@rtl-dev/core';
import { findWaveTest, waveViewKey } from '../packages/vscode/src/waveform-views';

const view: WaveView = { id: 'reset', name: 'Reset', radix: 'hex', signals: [{ path: 'tb.clk' }, { path: 'tb.data', radix: 'binary', color: 'pink' }] };
test('saved views support multiple named views, updates, defaults and deletion without cross-test identity collisions', () => {
  let book = putView(parseViewBook(undefined), view);
  book = putView(book, { ...view, id: 'data', name: 'Data' });
  book = parseViewBook({ ...book, defaultId: 'reset' });
  book = putView(book, { ...view, name: 'Startup' });
  assert.equal(book.defaultId, 'reset'); assert.equal(book.views.length, 2);
  assert.deepEqual(parseViewBook(JSON.parse(JSON.stringify(book))), book);
  assert.equal(deleteView(book, 'data').defaultId, 'reset');
  assert.equal(deleteView(book, 'reset').defaultId, undefined);
  assert.notEqual(waveViewKey('a', 'test', 'top'), waveViewKey('b', 'test', 'top'));
  assert.notEqual(waveViewKey('a', 'test', 'top'), waveViewKey('a', 'other', 'top'));
  assert.notEqual(waveViewKey('a', 'test', 'top'), waveViewKey('a', 'test', 'other'));
});
test('new dump identifiers resolve by hierarchy path and missing signals survive saving a reduced run', () => {
  const data = parseVcd('$scope module tb $end $var wire 1 NEW clk $end $upscope $end $enddefinitions $end #0 0NEW');
  assert.deepEqual(resolveView(view, data.signals), { selected: ['0'], missing: ['tb.data'] });
  const saved = retainMissing([{ path: 'tb.clk', color: 'blue' }], view, data.signals);
  assert.deepEqual(saved[1], view.signals[1]);
  assert.deepEqual(view.signals[0], { path: 'tb.clk' });
  const expanded = parseVcd('$scope module tb $end $var wire 8 ! data $end $var wire 1 " clk $end $upscope $end $enddefinitions $end #0 b0 ! 0"');
  assert.deepEqual(resolveView({ ...view, signals: saved }, expanded.signals), { selected: ['1', '0'], missing: [] });
});
test('corrupted, duplicate and over-limit view collections are rejected rather than silently overwritten', () => {
  assert.throws(() => parseViewBook({ version: 2, views: [] }));
  assert.throws(() => parseViewBook({ version: 1, views: [view], defaultId: 'absent' }));
  assert.throws(() => putView({ version: 1, views: [view] }, { ...view, id: 'other', name: 'RESET' }));
  assert.throws(() => putView(parseViewBook(undefined), { ...view, signals: [...view.signals, view.signals[0]] }));
  assert.throws(() => putView(parseViewBook(undefined), { ...view, signals: [{ path: 'a', color: 'url(evil)' as any }] }));
  assert.throws(() => parseViewBook({ version: 1, views: Array.from({ length: 21 }, (_, i) => ({ ...view, id: String(i), name: String(i) })) }));
  assert.throws(() => retainMissing(Array.from({ length: 32 }, (_, i) => ({ path: `x${i}` })), view, []));
});
test('two runs bind to the same test view key; other tests and arbitrary VCDs do not', async () => {
  await mkdir('.dev/tests', { recursive: true }); const root = await mkdtemp(path.resolve('.dev/tests/views-'));
  await createProject(root, true);
  const files: string[] = [];
  for (const id of ['run1', 'run2', 'run3']) {
    const dir = path.join(root, '.rtl/runs', id); await mkdir(dir, { recursive: true });
    const file = path.join(dir, '파형 wave.vcd'); await writeFile(file, ''); files.push(file);
    const name = id === 'run3' ? 'counter_reset' : 'counter_basic';
    await writeFile(path.join(dir, 'result.json'), JSON.stringify({ directory: dir, waveform: file, name, top: `${name}_tb` }));
  }
  const first = await findWaveTest(files[0], [root]); assert.ok(first);
  assert.equal((await findWaveTest(files[1], [root]))?.key, first.key);
  assert.notEqual((await findWaveTest(files[2], [root]))?.key, first.key);
  assert.equal(await findWaveTest(files[0], []), undefined);
  const standalone = path.join(root, 'standalone.vcd'); await writeFile(standalone, '');
  assert.equal(await findWaveTest(standalone, [root]), undefined);
  await writeFile(path.join(path.dirname(files[0]), 'result.json'), JSON.stringify({ directory: path.dirname(files[0]), waveform: files[1], name: 'counter_basic', top: 'counter_basic_tb' }));
  assert.equal(await findWaveTest(files[0], [root]), undefined);
});
