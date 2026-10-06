import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';
import { parseVcd, queryWindow, queryValues } from '@rtl-dev/waveform';
import { waveformHtml } from '../packages/vscode/src/waveform-html';

test('bundled waveform renders enum names, numeric overrides, raw bits and clears names on reload', async () => {
  const compiled = await build({ entryPoints: ['packages/vscode/src/webview/waveform.ts'], bundle: true, platform: 'browser', format: 'iife', write: false });
  const elements = new Map<string, any>(), listeners = new Map<string, any>(), texts: string[] = [], messages: any[] = [];
  let stored: any;
  let clock = 0; const frames: (() => void)[] = [];
  const paintOperations: string[] = [];
  let viewportMode = false;
  let plotWidth = 800, viewportHeight = 400, dropTarget: any;
  const resizeCallbacks: (() => void)[] = [];
  const windowMock = { innerWidth: 1200, devicePixelRatio: 1, addEventListener: (n: string, f: any) => listeners.set(n, f) };
  const ctx = new Proxy({ measureText: (text: string) => ({ width: text.length * 7 }), fillText: (text: string) => texts.push(text), clearRect: () => paintOperations.push('draw') } as any, { get: (o, k) => o[k] ?? (() => {}) });
  const create = (tagName = 'DIV'): any => ({ tagName, value: '', checked: false, disabled: false, textContent: '', dataset: {}, style: {}, children: [], events: new Map(), attrs: {},
    get clientWidth() { paintOperations.push('size'); return plotWidth; }, get clientHeight() { paintOperations.push('size'); return 42; },
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, setAttribute(n: string, v: string) { this.attrs[n] = v; },
    addEventListener(n: string, f: any) { this.events.set(n, f); }, append(...v: any[]) { v.forEach(c => c.parentElement = this); this.children.push(...v); }, replaceChildren(...v: any[]) { this.children = v; },
    setPointerCapture(id: number) { this.capture = id; }, releasePointerCapture() { this.capture = undefined; }, hasPointerCapture(id: number) { return this.capture === id; }, closest() { return this; }, focus() {},
    getContext() {
      if (!this.context) {
        const canvas = this; let path: any[] = [];
        this.strokes = [];
        this.context = new Proxy({ ...ctx, measureText: ctx.measureText, fillText: ctx.fillText, clearRect: ctx.clearRect,
          beginPath: () => path = [], moveTo: (x: number, y: number) => path.push([x, y]), lineTo: (x: number, y: number) => path.push([x, y]),
          stroke: () => canvas.strokes.push([...path]) }, { get: (o: any, k) => o[k] ?? (() => {}) });
      }
      return this.context;
    },
    getBoundingClientRect() {
      const index = element('trace-rows').children.indexOf(this.parentElement);
      const top = viewportMode && index >= 0 ? 36 + index * 43 - (element('traces').scrollTop || 0) : 0;
      return { left: 0, top, width: plotWidth, height: 42, bottom: viewportMode && this === element('traces') ? viewportHeight : top + 42 };
    },
    querySelector(selector: string) { return [...this.children, ...this.children.flatMap((c: any) => c.children)].find((c: any) => selector === 'canvas' ? c.tagName === 'CANVAS' : c.className === selector.slice(1)); }
  });
  const element = (id: string) => { if (!elements.has(id)) elements.set(id, create()); return elements.get(id); };
  vm.runInNewContext(compiled.outputFiles[0].text, {
    acquireVsCodeApi: () => ({ postMessage: (m: any) => messages.push(m), getState: () => undefined, setState: (v: any) => stored = v }),
    document: { body: create(), getElementById: element, createElement: (n: string) => create(n.toUpperCase()), elementFromPoint: () => dropTarget,
      querySelector: (s: string) => { const id = /data-id="([^"]+)"/.exec(s)?.[1]; return element('trace-rows').children.find((r: any) => r.dataset.id === id); },
      querySelectorAll: (s: string) => s === '.trace' ? element('trace-rows').children : s.startsWith('.bit-trace') ? element('trace-rows').children.filter((r: any) => r.className === 'trace bit-trace' && r.dataset.parent === /data-parent="([^"]+)"/.exec(s)?.[1]) : [] },
    window: windowMock,
    ResizeObserver: class { constructor(f: () => void) { resizeCallbacks.push(f); } observe() {} }, MutationObserver: class { observe() {} }, getComputedStyle: () => ({ getPropertyValue: () => '' }), setTimeout: (f: any) => { f(); return 1; }, clearTimeout() {},
    performance: { now: () => ++clock }, requestAnimationFrame: (f: () => void) => { frames.push(f); }
  });
  let wave = parseVcd('$timescale 1ns $end $scope module tb $end $var wire 2 ! state [1:0] $end $var wire 1 " flag $end $upscope $end $enddefinitions $end #0 b01 ! 1" #10 b11 ! 0"');
  const emit = (data: any) => listeners.get('message')({ data });
  const init = (names = true) => emit({ kind: 'init', name: 'states.vcd', metadata: { ...wave, enumLabels: names ? { '0': { '01': 'LOAD', '11': 'DONE' }, '1': { '0': 'OFF', '1': 'ON' } } : undefined }, views: {}, link: { state: 'unavailable' } });
  const paint = () => { const request = messages.filter(m => m.kind === 'window').at(-1); assert.ok(request); texts.length = 0; paintOperations.length = 0; emit({ kind: 'window', requestId: request.requestId, result: queryWindow(wave, request.request) });
    assert.ok(paintOperations.lastIndexOf('size') < paintOperations.indexOf('draw'), 'all canvas layout reads precede drawing writes'); };
  const label = (id: string) => element('trace-rows').children.find((r: any) => r.dataset.id === id).querySelector('.trace-value');
  init(); paint(); assert.equal(label('0').textContent, 'LOAD'); assert.equal(label('1').textContent, 'ON');
  assert.ok(texts.includes('LOAD')); assert.ok(texts.includes('ON'), 'one-bit enum has a segment label'); assert.match(label('0').title, /0x1.*01/);
  const parent = element('trace-rows').children.find((r: any) => r.dataset.id === '0');
  parent.children[0].children.find((c: any) => c.className === 'bus-toggle').events.get('click')({ preventDefault() {}, stopPropagation() {} });
  paint();
  assert.deepEqual(element('trace-rows').children.filter((r: any) => r.className === 'trace bit-trace').map((r: any) => r.querySelector('.trace-value').textContent), ['0', '1']);
  assert.equal(stored.enumLabels, undefined, 'mapping is never persisted as view state');
  element('radix').value = 'hex'; element('radix').onchange(); assert.equal(label('0').textContent, '0x1');
  element('radix').value = 'auto'; element('radix').onchange(); assert.equal(label('0').textContent, 'LOAD');
  emit({ kind: 'loading' }); assert.equal(element('trace-rows').children.length, 0);
  init(false); paint(); assert.equal(label('0').textContent, '0x1'); assert.equal(label('1').textContent, '1'); assert.ok(!texts.includes('LOAD'));
  assert.equal(messages.some(m => m.kind === 'renderProfile'), false, 'ordinary init never reports or schedules diagnostics');
  assert.equal(frames.length, 0);
  emit({ kind: 'init', name: 'states.vcd', metadata: wave, views: {}, link: { state: 'unavailable' }, renderProfile: 'diagnostic' }); paint();
  while (frames.length) frames.shift()!();
  const profile = messages.find(m => m.kind === 'renderProfile'); assert.ok(profile);
  assert.equal(profile.nonce, 'diagnostic'); assert.equal(profile.rows[0].value, '01');
  assert.ok(profile.initToFrameMs >= profile.initToDrawMs);
  assert.equal(stored.renderProfile, undefined, 'diagnostics never enter persisted view state');
  const beforeProbe = messages.filter(m => m.kind === 'window').length;
  emit({ kind: 'renderProbe', nonce: 'obsolete', time: '10' });
  assert.equal(messages.filter(m => m.kind === 'window').length, beforeProbe);
  emit({ kind: 'renderProbe', nonce: 'diagnostic', time: '10' }); paint();
  while (frames.length) frames.shift()!();
  assert.equal(messages.filter(m => m.kind === 'renderProfile').at(-1).cursor, '10');
  assert.equal(label('0').textContent, '0x3');
  emit({ kind: 'loading' }); emit({ kind: 'renderProbe', nonce: 'diagnostic', time: '0' });
  assert.equal(messages.filter(m => m.kind === 'window').length, beforeProbe + 1, 'loading revokes diagnostic probe');

  // Exercise the actual bundled renderer with a bounded viewport, not just a
  // helper that repeats the implementation. Hidden values must stay exact and
  // newly revealed canvases must paint without another worker query.
  viewportMode = true;
  const origin = 9007199254740993n;
  wave = parseVcd(`$timescale 1ps $end $scope module top $end ${Array.from({ length: 32 }, (_, id) => `$var wire 8 c${id} p${id} [7:0] $end`).join(' ')} $upscope $end $enddefinitions $end #${origin} ${Array.from({ length: 32 }, (_, id) => `b${id.toString(2).padStart(8, '0')} c${id}`).join(' ')} #${origin + 200n} b11111111 c0`);
  emit({ kind: 'init', name: 'viewport.vcd', metadata: wave, views: {}, link: { state: 'unavailable' }, renderProfile: 'viewport' });
  emit({ kind: 'renderProbe', nonce: 'viewport', time: String(origin + 100n), options: { parents: 32, expanded: 16, from: String(origin), to: String(origin + 200n) } });
  paint();
  assert.equal(element('trace-rows').children.length, 160);
  assert.ok(paintOperations.filter(op => op === 'draw').length < 20, 'offscreen canvases are not painted');
  assert.equal(label('31').textContent, '0x1F', 'offscreen parent value remains exact');
  assert.ok(texts.includes('9007 s'), 'long times retain the absolute whole-second component');
  assert.ok(texts.some(t => /^199,254,\d{3},\d{3} ps$/.test(t)), 'absolute subsecond remainder is drawn on a second line');
  assert.ok(!texts.some(t => /^\+/.test(t)), 'ruler never shows viewport-relative times');
  assert.match(element('range').textContent, /^9007\.199254740993 s — /);
  const firstCanvas = element('trace-rows').children[0].querySelector('canvas');
  assert.equal(firstCanvas.strokes.at(-1)[0][0], element('ruler').strokes.at(-1)[0][0], 'cursor x is identical for ruler and wave at a large offset');
  const bottomCanvas = element('trace-rows').children.at(-1).querySelector('canvas');
  const queries = messages.filter(m => m.kind === 'window').length;
  element('traces').scrollTop = 160 * 43 - 350;
  element('traces').events.get('scroll')();
  while (frames.length) frames.shift()!();
  const viewportProfile = messages.filter(m => m.kind === 'renderProfile' && m.nonce === 'viewport').at(-1);
  assert.equal(viewportProfile.details.parentRows, 32);
  assert.equal(viewportProfile.details.bitRows.length, 128);
  assert.ok(bottomCanvas.strokes?.length, 'scroll reveals a painted bottom row');
  assert.equal(messages.filter(m => m.kind === 'window').length, queries, 'scroll reuses current validated window');
  const scroll = element('traces').scrollTop;
  emit({ kind: 'loading' });
  emit({ kind: 'init', name: 'viewport.vcd', metadata: wave, views: {}, link: { state: 'unavailable' }, renderProfile: 'viewport' }); paint();
  assert.equal(element('traces').scrollTop, scroll, 'Reload restores vertical position');

  const parentRows = () => element('trace-rows').children.filter((r: any) => r.dataset.id !== undefined);
  const rowLabel = (id: string) => parentRows().find((r: any) => r.dataset.id === id).children[0];
  const input = (extra: any = {}) => ({ button: 0, pointerId: 7, clientX: 5, clientY: 5, ctrlKey: false, metaKey: false, shiftKey: false, preventDefault() {}, stopPropagation() {}, ...extra });
  const oldCursor = stored.a;
  element('traces').scrollTop = 0;
  const beforeShortcut = messages.filter(m => m.kind === 'window').length;
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
    let intercepted = false;
    element('traces').events.get('keydown')(input({ target: element('traces'), key: '-', [modifier]: true, preventDefault() { intercepted = true; } }));
    assert.equal(intercepted, false, 'host editor shortcut is not intercepted by waveform zoom');
  }
  assert.equal(messages.filter(m => m.kind === 'window').length, beforeShortcut);
  // Ctrl non-adjacent and Shift contiguous selections go through actual DOM
  // handlers. Expanded bits must travel with their bus, never independently.
  rowLabel('1').events.get('click')(input());
  rowLabel('3').events.get('click')(input({ ctrlKey: true }));
  dropTarget = rowLabel('6');
  const groupY = dropTarget.getBoundingClientRect().bottom + 1;
  const groupLabel = rowLabel('1');
  groupLabel.events.get('pointerdown')(input());
  groupLabel.events.get('pointermove')(input({ clientY: groupY }));
  groupLabel.events.get('pointerup')(input({ clientY: groupY })); paint();
  assert.deepEqual(Array.from(parentRows().slice(0, 7), (r: any) => r.dataset.id), ['0','2','4','5','6','1','3']);
  assert.equal(stored.a, oldCursor, 'group reorder never changes the time cursor');
  assert.equal(element('trace-rows').children.filter((r: any) => r.dataset.parent === '1').length, 8);
  rowLabel('2').events.get('click')(input());
  rowLabel('5').events.get('click')(input({ shiftKey: true }));
  dropTarget = rowLabel('0'); const rangeLabel = rowLabel('2');
  rangeLabel.events.get('pointerdown')(input());
  rangeLabel.events.get('pointermove')(input({ clientY: -50 }));
  rangeLabel.events.get('pointerup')(input({ clientY: -50 })); paint();
  assert.deepEqual(Array.from(parentRows().slice(0, 7), (r: any) => r.dataset.id), ['2','4','5','0','6','1','3']);
  const cancelledOrder = JSON.stringify(stored.paths), queryCount = messages.filter(m => m.kind === 'window').length;
  dropTarget = rowLabel('6'); const cancelledLabel = rowLabel('2');
  cancelledLabel.events.get('pointerdown')(input()); cancelledLabel.events.get('pointermove')(input({ clientY: 50 }));
  cancelledLabel.events.get('keydown')(input({ key: 'Escape' }));
  cancelledLabel.events.get('lostpointercapture')(input()); cancelledLabel.events.get('pointerup')(input({ clientY: 50 }));
  assert.equal(JSON.stringify(stored.paths), cancelledOrder, 'Esc prevents a late row drop');
  assert.equal(messages.filter(m => m.kind === 'window').length, queryCount, 'cancelled row drag does not query');

  element('traces').scrollTop = 0;
  const canvas = parentRows()[0].querySelector('canvas');
  for (const mode of ['cursor', 'zoom']) {
    element('gesture').value = mode;
    const before = { a: stored.a, from: stored.from, to: stored.to };
    canvas.events.get('pointerdown')(input({ clientX: 100 }));
    canvas.events.get('pointermove')(input({ clientX: 600 }));
    const stale = messages.filter(m => m.kind === 'window').at(-1);
    listeners.get('keydown')(input({ key: 'Escape' }));
    canvas.events.get('lostpointercapture')(input()); canvas.events.get('pointerup')(input({ clientX: 600 }));
    emit({ kind: 'window', requestId: stale.requestId, result: queryWindow(wave, stale.request) });
    paint();
    assert.deepEqual({ a: stored.a, from: stored.from, to: stored.to }, before, `${mode} Escape restores cursor/range after a late response`);
    assert.equal(canvas.capture, undefined);
  }
  for (const ratio of [1, 1.25, 2]) for (const width of [96, 333, 801]) {
    windowMock.devicePixelRatio = ratio; plotWidth = width; resizeCallbacks[0](); paint();
    const visibleCanvas = parentRows()[0].querySelector('canvas');
    assert.equal(visibleCanvas.width, Math.round(width * ratio));
    assert.equal(visibleCanvas.strokes.at(-1)[0][0], element('ruler').strokes.at(-1)[0][0], 'resize/DPR keep the common cursor coordinate');
  }
  // Collapse from overflowing 160 rows to one row, then reveal the full set.
  emit({ kind: 'renderProbe', nonce: 'viewport', time: String(origin + 100n), options: { parents: 1, expanded: 0 } }); paint();
  assert.equal(element('trace-rows').children.length, 1);
  emit({ kind: 'renderProbe', nonce: 'viewport', time: String(origin + 100n), options: { parents: 32, expanded: 16 } }); paint();
  assert.equal(element('trace-rows').children.length, 160);
  viewportHeight = 800; resizeCallbacks[0](); paint();
  assert.ok(paintOperations.filter(op => op === 'draw').length > 10, 'height resize redraws newly visible rows');
  emit({ kind: 'init', name: 'candidate.vcd', metadata: wave, views: {}, renderProfile: 'candidate', cursorReuse: true }); paint();
  const windowsBeforeReuse = messages.filter(m => m.kind === 'window').length;
  emit({ kind: 'renderProbe', nonce: 'candidate', time: String(origin + 101n) });
  const firstValues = messages.filter(m => m.kind === 'values').at(-1); assert.ok(firstValues);
  emit({ kind: 'renderProbe', nonce: 'candidate', time: String(origin + 102n) });
  const lastValues = messages.filter(m => m.kind === 'values').at(-1);
  emit({ kind: 'values', requestId: firstValues.requestId, result: queryValues(wave, firstValues.request) });
  emit({ kind: 'values', requestId: lastValues.requestId, result: queryValues(wave, lastValues.request) });
  while (frames.length) frames.shift()!();
  assert.equal(messages.filter(m => m.kind === 'window').length, windowsBeforeReuse);
  const reusedProfile = messages.filter(m => m.kind === 'renderProfile' && m.nonce === 'candidate').at(-1);
  assert.equal(reusedProfile.cursor, String(origin + 102n));
  assert.equal(JSON.stringify(reusedProfile.rows), JSON.stringify(queryWindow(wave, lastValues.request).rows.map(row => ({ id: row.id, value: row.value }))));
  for (const bit of reusedProfile.details.bitRows) assert.equal(bit.value, queryValues(wave, lastValues.request).rows.find(row => row.id === bit.parent)!.value[7 - Number(bit.offset)]);
  const cursorRequest = () => {
    emit({ kind: 'renderProbe', nonce: 'candidate', time: String((BigInt(stored.from) + BigInt(stored.to)) / 2n) });
    const request = messages.filter(m => ['window', 'values'].includes(m.kind)).at(-1);
    assert.equal(request.kind, 'values'); return request;
  };
  const mixed = (name: string, action: () => void) => {
    const old = cursorRequest(); action();
    const fresh = messages.filter(m => ['window', 'values'].includes(m.kind)).at(-1);
    assert.equal(fresh.kind, 'window', `${name} changes the viewport key`);
    emit({ kind: 'values', requestId: old.requestId, result: queryValues(wave, old.request) });
    paint(); while (frames.length) frames.shift()!();
    const before = JSON.stringify(stored), count = messages.length;
    emit({ kind: 'values', requestId: old.requestId, result: queryValues(wave, old.request) });
    assert.equal(JSON.stringify(stored), before); assert.equal(messages.length, count, `${name} late values stay obsolete`);
    const next = cursorRequest(); emit({ kind: 'values', requestId: next.requestId, result: queryValues(wave, next.request) });
    while (frames.length) frames.shift()!();
  };
  mixed('resize', () => { plotWidth += 97; resizeCallbacks[0](); });
  mixed('zoom', () => element('zoom-in').onclick());
  mixed('pan', () => element('pan-left').onclick());
  mixed('reorder', () => {
    const first = parentRows()[0].dataset.id, third = parentRows()[2].dataset.id;
    rowLabel(first).events.get('click')(input()); dropTarget = rowLabel(third);
    const label = rowLabel(first), y = dropTarget.getBoundingClientRect().bottom + 1;
    label.events.get('pointerdown')(input()); label.events.get('pointermove')(input({ clientY: y })); label.events.get('pointerup')(input({ clientY: y }));
  });
  const failed = cursorRequest(); emit({ kind: 'error', requestId: failed.requestId, error: 'Injected read failure' });
  emit({ kind: 'renderProbe', nonce: 'candidate', time: stored.a });
  assert.equal(messages.filter(m => ['window', 'values'].includes(m.kind)).at(-1).kind, 'window', 'error discards cached viewport'); paint();
  const malformed = cursorRequest();
  emit({ kind: 'values', requestId: malformed.requestId, result: { cursor: malformed.request.cursor, rows: [] } });
  assert.equal(messages.filter(m => ['window', 'values'].includes(m.kind)).at(-1).kind, 'window', 'invalid values recover with full query'); paint();
  emit({ kind: 'loading' });
  emit({ kind: 'values', requestId: lastValues.requestId, result: queryValues(wave, lastValues.request) });
  assert.equal(element('trace-rows').children.length, 0, 'late reused values cannot restore cleared rows');
  emit({ kind: 'init', name: 'candidate.vcd', metadata: wave, views: {}, renderProfile: 'reopened', cursorReuse: true });
  assert.equal(messages.at(-1).kind, 'window', 'reader generation starts with a full viewport');
  emit({ kind: 'init', name: 'ordinary.vcd', metadata: wave, views: {}, cursorReuse: true }); paint();
  const diagnosticsBefore = messages.filter(m => m.kind === 'renderProfile').length;
  element('gesture').value = 'cursor';
  const ordinaryCanvas = parentRows()[0].querySelector('canvas');
  ordinaryCanvas.events.get('pointerdown')(input({ clientX: 300 }));
  ordinaryCanvas.events.get('pointerup')(input({ clientX: 300 }));
  const ordinaryValues = messages.filter(m => ['window', 'values'].includes(m.kind)).at(-1);
  assert.equal(ordinaryValues.kind, 'values', 'ordinary init also enables cursor-only queries');
  emit({ kind: 'values', requestId: ordinaryValues.requestId, result: queryValues(wave, ordinaryValues.request) });
  while (frames.length) frames.shift()!();
  assert.equal(messages.filter(m => m.kind === 'renderProfile').length, diagnosticsBefore, 'ordinary reuse does not enable telemetry');
});

test('ruler and trace rows share one scroll surface and column geometry', () => {
  const html = waveformHtml('script', 'css', 'source', 'nonce');
  assert.match(html, /id="traces"[^>]*><div class="ruler-row">[\s\S]*id="ruler"[\s\S]*id="trace-rows"><\/div><\/div>/);
});
