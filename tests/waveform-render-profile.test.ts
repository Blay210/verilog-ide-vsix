import test from 'node:test';
import assert from 'node:assert/strict';
import { createRenderProfile } from '../packages/vscode/src/webview/render-profile';
import { parseRenderProbe, parseRenderDetails, parseHostWindowTiming, validRenderTimings } from '../packages/vscode/src/render-probe';

test('host timing remains optional, bounded and separate from renderer clock intervals', () => {
  let clock = 0; const frames: (() => void)[] = [], messages: any[] = [];
  const profiler = createRenderProfile(m => messages.push(m), () => clock, f => frames.push(f), () => true);
  profiler.reset('transport'); profiler.request(1, '10'); clock = 80;
  profiler.response(1, [], () => { clock += 2; }, undefined, { queueMs: 3, windowMs: 20, ignored: 999 });
  while (frames.length) frames.shift()!();
  assert.deepEqual(messages[0].hostTiming, { queueMs: 3, windowMs: 20 });
  assert.equal(messages[0].queryRoundTripMs, 80);
  for (const value of [undefined, {}, { queueMs: 0 }, { queueMs: -1, windowMs: 1 }, { queueMs: 1, windowMs: Infinity }, { queueMs: 1, windowMs: 120001 }]) {
    assert.equal(parseHostWindowTiming(value), undefined);
  }
  profiler.request(2, '11'); clock += 4; profiler.response(2, [], () => {}, undefined, { queueMs: NaN, windowMs: 0 });
  while (frames.length) frames.shift()!(); assert.equal(messages[1].hostTiming, undefined);
});

test('late manual interaction keeps exact cursor diagnostics without relaxing query latency bounds', () => {
  let clock = 0; const frames: (() => void)[] = [], messages: any[] = [];
  const profiler = createRenderProfile(m => { if (validRenderTimings(m as any)) messages.push(m); }, () => clock, f => frames.push(f), () => true);
  profiler.reset('long-session'); clock = 600_000;
  profiler.request(1, '9007199254744127'); clock += 20;
  profiler.response(1, [{ id: '0', value: '00111111' }], () => { clock += 2; });
  while (frames.length) frames.shift()!();
  assert.equal(messages.length, 1);
  assert.equal(messages[0].cursor, '9007199254744127');
  assert.equal(messages[0].initToDrawMs, 600_022);
  for (const bad of [NaN, Infinity, -1, 120_001, '20', undefined]) {
    assert.equal(validRenderTimings({ ...messages[0], queryRoundTripMs: bad }), false);
  }
  assert.equal(validRenderTimings({ ...messages[0], initToDrawMs: 86_400_001 }), false);
});

test('draw subphases are explicit, accumulated and cleared after a draw error', () => {
  let clock = 0, clockReads = 0; const messages: any[] = [], frames: (() => void)[] = [];
  const profiler = createRenderProfile(m => messages.push(m), () => { clockReads++; return clock; }, f => { frames.push(f); }, () => true);
  assert.equal(profiler.measure('prepareMs', () => 42), 42); assert.equal(clockReads, 0);
  profiler.reset('profile'); profiler.request(1, '0');
  profiler.response(1, [], () => {
    profiler.measure('prepareMs', () => { clock += 2; });
    profiler.measure('bitPlotMs', () => { clock += 3; });
    profiler.measure('bitPlotMs', () => { clock += 5; });
  });
  while (frames.length) frames.shift()!();
  assert.deepEqual(messages[0].drawPhases, { prepareMs: 2, bitPlotMs: 8 }); assert.equal(messages[0].drawMs, 10);
  profiler.request(2, '0'); assert.throws(() => profiler.response(2, [], () => { throw Error('draw'); }));
  const before = clockReads; profiler.measure('prepareMs', () => 42); assert.equal(clockReads, before);
});

test('maximum-row probes and DOM details reject invalid ranges, excessive rows and unknown bit digits', () => {
  assert.deepEqual(parseRenderProbe({ parents: 32, expanded: 16, from: '9007199254740993', to: '9007199254741025', ignored: true }),
    { parents: 32, expanded: 16, from: '9007199254740993', to: '9007199254741025', reload: undefined });
  for (const value of [{ parents: 33 }, { expanded: -1 }, { from: '10' }, { from: '10', to: '9' }, { reload: 'yes' }]) assert.throws(() => parseRenderProbe(value));
  const details = { from: '0', to: '10', parentRows: 32, denseRows: 32, bitRows: Array.from({ length: 128 }, (_, i) => ({ parent: String(i >> 3), offset: String(i % 8), value: 'z' })) };
  assert.equal(parseRenderDetails(details)?.bitRows.length, 128);
  assert.throws(() => parseRenderDetails({ ...details, bitRows: [...details.bitRows, details.bitRows[0]] }));
  assert.throws(() => parseRenderDetails({ ...details, bitRows: [{ parent: '0', offset: '0', value: 'unknown' }] }));
  assert.throws(() => parseRenderDetails({ ...details, denseRows: 33 }));
});

test('renderer diagnostic is opt-in, separates RTT/draw/frame and rejects obsolete generations', () => {
  let clock = 0, draws = 0; const frames: (() => void)[] = [], messages: any[] = [];
  const profiler = createRenderProfile(m => messages.push(m), () => clock, f => { frames.push(f); }, () => true);
  profiler.request(1, '0'); profiler.response(1, [], () => { draws++; });
  assert.equal(draws, 1); assert.equal(frames.length, 0); assert.equal(messages.length, 0);
  clock = 10; profiler.reset('first'); clock = 20; profiler.request(2, '9007199254740994');
  clock = 25; profiler.response(2, [{ id: '0', value: 'zz' }], () => { clock = 28; });
  clock = 35; frames.shift()!(); clock = 45; frames.shift()!();
  assert.deepEqual(messages[0], { kind: 'renderProfile', nonce: 'first', requestId: 2, queryRoundTripMs: 5, drawMs: 3,
    initToDrawMs: 18, initToFrameMs: 35, cursor: '9007199254740994', rows: [{ id: '0', value: 'zz' }], visible: true });
  profiler.request(3, '0'); profiler.response(3, [], () => {}); profiler.reset('reload');
  frames.shift()!(); frames.shift()!(); assert.equal(messages.length, 1);
  assert.equal(profiler.matches('first'), false); assert.equal(profiler.matches('reload'), true);
  profiler.reset(); assert.equal(profiler.matches('reload'), false);
});

test('superseded draws and excessive diagnostic samples remain bounded', () => {
  let clock = 0; const frames: (() => void)[] = [], messages: any[] = [];
  const profiler = createRenderProfile(m => messages.push(m), () => ++clock, f => { frames.push(f); }, () => false);
  profiler.reset('x');
  for (let id = 0; id < 40; id++) profiler.request(id, '0');
  profiler.response(0, [], () => {}); assert.equal(frames.length, 0, 'old request evicted');
  profiler.response(38, [], () => {}); profiler.response(39, [], () => {});
  while (frames.length) frames.shift()!(); assert.equal(messages.length, 1); assert.equal(messages[0].requestId, 39);
  for (let id = 40; id < 80; id++) {
    profiler.request(id, '0'); profiler.response(id, Array.from({ length: 40 }, (_, i) => ({ id: String(i), value: '1' })), () => {});
    while (frames.length) frames.shift()!();
  }
  assert.equal(messages.length, 16); assert.equal(messages[1].rows.length, 32); assert.equal(messages[0].visible, false);
});
