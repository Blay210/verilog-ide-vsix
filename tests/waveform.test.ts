import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, mkdtemp, writeFile, open } from 'node:fs/promises';
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { parseVcd, queryWindow, queryValues, adjacentChange, valueAt, formatTime, parseTime, formatValue, positionTime, selectionRange, LIMITS } from '@rtl-dev/waveform';
import { WaveformSession } from '@rtl-dev/waveform/client';
import { waveformHtml } from '../packages/vscode/src/waveform-html';

const header = '$timescale 1 ps $end\n$scope module top $end\n$var wire 1 ! clk $end\n$var wire 8 # data [7:0] $end\n$scope module dut $end\n$var wire 1 ! clk $end\n$upscope $end\n$upscope $end\n$enddefinitions $end\n';
const text = header + '$dumpvars\n0! b1 #\n$end\n#5 1! bxx #\n#10 0! bz #\n#15 1! b11111111 #\n#20';

test('nearest transition snapping is inclusive, deterministic and independent of display density', () => {
  const data = parseVcd(text);
  assert.equal(adjacentChange(data, '0', '5', 0), '5');
  assert.equal(adjacentChange(data, '0', '8', 0), '10');
  assert.equal(adjacentChange(data, '0', '20', 0), '15');
  assert.equal(adjacentChange(data, '1', '0', 0), '0');
  const large = parseVcd(header + '#90071992547409930 0! #90071992547409940 1!');
  assert.equal(adjacentChange(large, '0', '90071992547409935', 0), '90071992547409930');
  assert.equal(adjacentChange(large, '0', '90071992547409936', 0), '90071992547409940');
  assert.equal(adjacentChange(large, '1', '0', 0), undefined);
  assert.throws(() => adjacentChange(data, '0', '1', 2));
});

test('pointer range selection preserves large time offsets, reversal and boundaries', () => {
  const from = 90071992547409930n, end = from + 100n;
  assert.equal(positionTime(50, 100, from, end, end), from + 50n);
  assert.equal(positionTime(-10, 100, from, end, end), from);
  assert.equal(positionTime(150, 100, from, end, end), end);
  assert.equal(positionTime(10, 100, 0n, 1n, 0n), 0n);
  assert.deepEqual(selectionRange(end, from), { from, length: 100n });
  assert.equal(selectionRange(from, from), undefined);
  assert.throws(() => positionTime(0, 0, from, end, end));
});

test('wide aliased buses bound window transport while preserving cursor values', () => {
  const signals = Array.from({ length: 32 }, (_, i) => ({ id: String(i), code: '!', name: `bus${i}`, scope: 'top', path: `top.bus${i}`, width: 16384, type: 'wire' }));
  const changes = Array.from({ length: 500 }, (_, i) => ({ time: String(i), value: String(i % 2).repeat(16384) }));
  const data = { signals, channels: new Map([['!', changes]]), timescale: { magnitude: 1, unit: 'ns' as const }, end: '500', changes: 500, warnings: [] };
  const result = queryWindow(data, { signals: signals.map(s => s.id), from: '0', to: '500', cursor: '499', pixels: 1600 });
  assert.ok(JSON.stringify(result).length < 4 * 1024 * 1024);
  assert.ok(result.rows.every(row => row.dense && row.value === '1'.repeat(16384)));
  assert.equal(result.rows[0].buckets!.reduce((sum, cell) => sum + cell.edges, 0), 499);
});
test('VCD declarations, aliases, dump commands, four-state padding and boundaries', () => {
  const data = parseVcd(text);
  assert.equal(data.signals.length, 3); assert.equal(data.channels.size, 2);
  assert.equal(data.signals[2].path, 'top.dut.clk'); assert.equal(data.end, '20');
  const view = queryWindow(data, { signals: ['0', '1', '2'], from: '5', to: '20', cursor: '10', pixels: 100 });
  assert.equal(view.rows[1].initial, 'xxxxxxxx'); assert.equal(view.rows[1].value, 'zzzzzzzz');
  assert.equal(view.rows[0].initial, '1'); assert.equal(view.rows[0].value, '0');
  assert.deepEqual(view.rows[0].changes, view.rows[2].changes);
  assert.equal(adjacentChange(data, '0', '5', 1), '10'); assert.equal(adjacentChange(data, '0', '5', -1), '0');
  assert.equal(adjacentChange(data, '0', '0', -1), undefined);
});
test('exact integer timestamps and physical units beyond Number precision', () => {
  const large = '9007199254740993', data = parseVcd(header + `#${large} 1!\n#9007199254740994 0!`);
  assert.equal(valueAt(data.channels.get('!')!, BigInt(large) - 1n), 'x');
  assert.equal(valueAt(data.channels.get('!')!, BigInt(large)), '1');
  assert.equal(parseTime(formatTime(BigInt(large), data.timescale), data.timescale), BigInt(large));
  assert.equal(parseTime('12.5 ns', { magnitude: 10, unit: 'ps' }), 1250n);
  assert.throws(() => parseTime('1 ps', { magnitude: 10, unit: 'ps' }), /align/);
});
test('same-timestamp updates retain final values without phantom edges', () => {
  const data = parseVcd(header + '#0 0! #5 1! 0! #10 1! #20');
  assert.deepEqual(data.channels.get('!'), [{ time: '0', value: '0' }, { time: '10', value: '1' }]);
  assert.equal(adjacentChange(data, '0', '0', 1), '10');
});

test('canonical shared timestamps preserve padded ticks and same-tick updates across channels', () => {
  const data = parseVcd(header + '$dumpvars 0! b1 # $end #0005 1! b10 # #5 0! b11 # #00090071992547409930 1! bxx #');
  assert.deepEqual(data.channels.get('!'), [{ time: '0', value: '0' }, { time: '90071992547409930', value: '1' }]);
  assert.deepEqual(data.channels.get('#'), [{ time: '0', value: '00000001' }, { time: '5', value: '00000011' }, { time: '90071992547409930', value: 'xxxxxxxx' }]);
  assert.equal(queryValues(data, { signals: ['0', '1'], cursor: '5' }).rows[1].value, '00000011');
});
test('unknown initial values, real values, special identifier codes and zero duration', () => {
  const data = parseVcd('$var real 64 $end temperature $end\n$var wire 4 # nibble $end\n$enddefinitions $end\n#0 r1.25 $end b1 #');
  assert.equal(data.channels.get('$end')![0].value, '1.25'); assert.equal(data.warnings.length, 1);
  assert.equal(queryWindow(data, { signals: ['0', '1'], from: '0', to: '1', cursor: '0', pixels: 10 }).rows[1].value, '0001');
});
test('invalid traces and invalid viewport requests fail without partial data', () => {
  for (const source of [header + '#5 0! #4 1!', header + '1missing', header + 'b111111111 #', header + '$dumpvars 0!', header.replace('$upscope $end', ''), header + '#not_a_time', header.replace('wire 1 !', 'event 1 !')]) assert.throws(() => parseVcd(source));
  const data = parseVcd(text);
  for (const request of [{ from: '-1', to: '10' }, { from: '0', to: '21' }, { from: '10', to: '1' }]) assert.throws(() => queryWindow(data, { ...request, signals: ['0'], cursor: '0', pixels: 10 }));
  assert.throws(() => queryWindow(data, { from: '0', to: '20', signals: ['unknown'], cursor: '0', pixels: 10 }));
  assert.throws(() => queryWindow(data, { from: '0', to: '20', signals: ['0'], cursor: '0', pixels: 50000 }));
});
test('dense windows bound payload while retaining exact cursor values and transitions', () => {
  const data = parseVcd(header + Array.from({ length: 5000 }, (_, i) => `#${i} ${i % 2}!`).join('\n'));
  const row = queryWindow(data, { signals: ['0'], from: '0', to: '4999', cursor: '3333', pixels: 32 }).rows[0];
  assert.equal(row.dense, true); assert.equal(row.value, '1'); assert.equal(row.changes.length, 0); assert.equal(row.buckets!.length, 32);
  assert.equal(row.buckets!.reduce((sum, b) => sum + b.edges, 0), 4999);
  const detail = queryWindow(data, { signals: ['0'], from: '3330', to: '3340', cursor: '3333', pixels: 32 }).rows[0];
  assert.equal(detail.dense, false); assert.equal(detail.changes.length, 10);
});
test('wide signed/unsigned/binary formatting and unknown bus digits remain explicit', () => {
  assert.equal(formatValue('1'.repeat(65), 'signed'), '-1'); assert.equal(formatValue('1'.repeat(65), 'unsigned'), '36893488147419103231');
  assert.equal(formatValue('00101111', 'hex'), '0x2F'); assert.equal(formatValue('xxxxzzzz', 'hex'), '0xXZ');
  assert.equal(formatValue('10xz', 'binary'), '10XZ'); assert.equal(formatValue('-1.2e3', 'hex', true), '-1.2e3');
});
test('waveform shell restricts scripts and escapes resource URLs', () => {
  const html = waveformHtml('safe.js?x="<script>', 'style.css', 'https://local.invalid', 'abc123');
  assert.ok(!html.includes('x="<script>')); assert.match(html, /default-src 'none'/); assert.match(html, /script-src 'nonce-abc123'/);
  assert.match(html, /aria-label="Go to time"/);
});
test('worker reads Unicode paths, queries a bounded window, rejects oversized files and cancels', async () => {
  const base = path.resolve('.dev/tests'); await mkdir(base, { recursive: true });
  const root = await mkdtemp(path.join(base, 'wave-')), worker = path.join(root, 'worker.cjs');
  await build({ entryPoints: ['packages/waveform/src/worker.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: worker });
  const file = path.join(root, '파형 space.vcd'); await writeFile(file, text);
  const session = new WaveformSession(worker);
  try {
    assert.equal((await session.load(file)).signals.length, 3);
    assert.equal((await session.window({ signals: ['0'], from: '0', to: '20', cursor: '5', pixels: 20 })).rows[0].value, '1');
    assert.equal(await session.edge('0', '5', 1), '10');
    assert.equal(await session.edge('0', '8', 0), '10');
    const large = path.join(root, 'large.vcd'), fd = await open(large, 'w'); await fd.truncate(LIMITS.bytes + 1); await fd.close();
    await assert.rejects(session.load(large), /32 MiB/);
    await assert.rejects(session.values({signals:['0'],cursor:'0'}), /not loaded/);
  } finally { await session.dispose(); }
  const cancelled = new WaveformSession(worker), pending = assert.rejects(cancelled.load(file), /cancelled|closed/);
  await cancelled.dispose(); await pending;
  await assert.rejects(cancelled.load(file), /closed/);
});

test('cursor observations preserve exact ticks, aliases and X/Z without transporting transitions', () => {
  const data = parseVcd(text);
  const values = queryValues(data, {signals:['0','1','2'],cursor:'10'});
  assert.deepEqual(values, {cursor:'10',rows:[{id:'0',value:'0'},{id:'1',value:'zzzzzzzz'},{id:'2',value:'0'}]});
  assert.equal(queryValues(data,{signals:['1'],cursor:'5'}).rows[0].value,'xxxxxxxx');
  const wide = parseVcd(header + '#90071992547409930 0! #90071992547409940 1!');
  assert.equal(queryValues(wide,{signals:['0'],cursor:'90071992547409939'}).rows[0].value,'0');
  assert.equal(queryValues(wide,{signals:['0'],cursor:'90071992547409940'}).rows[0].value,'1');
  const zero = parseVcd(header + '#0 0!');
  assert.equal(queryValues(zero,{signals:['1'],cursor:'0'}).rows[0].value,'xxxxxxxx');
  assert.throws(()=>queryValues(zero,{signals:['0'],cursor:'1'}), /Invalid/);
  for (const request of [{signals:['0'],cursor:'21'},{signals:['0'],cursor:'-1'},{signals:['0'],cursor:0},{signals:['0','0'],cursor:'0'},{signals:['unknown'],cursor:'0'},{signals:Array.from({length:33},(_,i)=>String(i)),cursor:'0'}]) assert.throws(()=>queryValues(data,request as any));
});

test('worker consumes verified bytes, fails closed on reload and serializes competing loads', async () => {
  const base=path.resolve('.dev/tests');await mkdir(base,{recursive:true});
  const root=await mkdtemp(path.join(base,'verified-wave-')),worker=path.join(root,'worker.cjs');
  await build({entryPoints:['packages/waveform/src/worker.ts'],bundle:true,platform:'node',format:'cjs',outfile:worker});
  const bytes=Buffer.from(text),hash=createHash('sha256').update(bytes).digest('hex');
  const session=new WaveformSession(worker);
  try {
    await assert.rejects(session.loadVerified(new Uint8Array(new SharedArrayBuffer(bytes.length)),hash),/shared memory/);
    const pending=session.loadVerified(bytes,hash);
    // postMessage copies the verified payload synchronously; later caller edits cannot alter it.
    bytes.fill(0);
    const loaded=await pending;assert.equal(loaded.sha256,hash);assert.equal(loaded.bytes,Buffer.byteLength(text));
    assert.equal((await session.values({signals:['1'],cursor:'10'})).rows[0].value,'zzzzzzzz');
    await assert.rejects(session.loadVerified(Buffer.from(text.replace('bxx','b11')),hash),/hash/);
    await assert.rejects(session.values({signals:['1'],cursor:'10'}),/not loaded/);
    const bad=Buffer.from('not VCD');
    await assert.rejects(session.loadVerified(bad,createHash('sha256').update(bad).digest('hex')));
    await assert.rejects(session.edge('0','0',1),/not loaded/);
    const file=path.join(root,'파형 space.vcd');await writeFile(file,text);
    const other=Buffer.from(header+'#0 1! #20');
    const a=session.load(file),b=session.loadVerified(other,createHash('sha256').update(other).digest('hex'));
    await Promise.all([a,b]);
    assert.equal((await session.values({signals:['0'],cursor:'0'})).rows[0].value,'1');
    assert.equal(await session.edge('0','0',1),undefined);
  } finally {await session.dispose();}
  await assert.rejects(session.loadVerified(Buffer.from(text),hash),/closed/);
});

test('concurrent disposal waits for actual worker exit, including an error-closed session', async () => {
  const base = path.resolve('.dev/tests'); await mkdir(base, { recursive: true });
  const root = await mkdtemp(path.join(base, 'wave-exit-')), file = path.join(root, 'worker.cjs');
  await writeFile(file, "require('node:worker_threads').parentPort.on('message',()=>{});");
  const session = new WaveformSession(file);
  const worker = (session as any).worker;
  let exited = false; worker.on('exit', () => { exited = true; });
  const cancelled = assert.rejects(session.load('pending.vcd'), /cancelled/);
  const first = session.dispose(), second = session.dispose();
  assert.equal(first, second, 'Concurrent close callers must share termination');
  await second; assert.equal(exited, true); await first; await cancelled;
  const closed = new WaveformSession(file), closedWorker = (closed as any).worker;
  let closedExited = false; closedWorker.on('exit', () => { closedExited = true; });
  // An error can close requests before the exit notification arrives.
  closedWorker.emit('error', Error('Reader failed'));
  await assert.rejects(closed.load('anything'), /closed/);
  await closed.dispose(); assert.equal(closedExited, true);
});
