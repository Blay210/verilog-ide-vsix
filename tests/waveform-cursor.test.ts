import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';
import { parseVcd } from '@rtl-dev/waveform';
import { waveformHtml } from '../packages/vscode/src/waveform-html';

test('waveform offers a single cursor and range tool without a second control strip', () => {
  const html = waveformHtml('script.js', 'style.css', 'source', 'nonce');
  assert.doesNotMatch(html, /Cursor [AB]|enable-b|cursor-b|cursor-strip|id="delta"|VALUE AT A/);
  assert.match(html, /<option value="cursor">Cursor<\/option><option value="zoom">Zoom range<\/option>/);
  assert.equal((html.match(/id="cursor-a"/g) ?? []).length, 1);
});

test('actual single cursor migrates old B state, handles Shift drag, zoom, escape and snap', async () => {
  const compiled = await build({ entryPoints: ['packages/vscode/src/webview/waveform.ts'], bundle: true, platform: 'browser', format: 'iife', write: false });
  const elements = new Map<string, any>(), listeners = new Map<string, any>(), sent: any[] = [];
  let stored: any;
  const context = new Proxy({ measureText: (text: string) => ({ width: text.length * 7 }) } as any, { get: (o, k) => o[k] ?? (() => {}) });
  const create = (tagName = 'DIV'): any => ({
    tagName, value: '', textContent: '', dataset: {}, style: {}, children: [], clientWidth: 800, clientHeight: 36,
    events: new Map(), classList: { add() {}, remove() {}, toggle() {} },
    setAttribute() {}, focus() {}, setPointerCapture() {}, releasePointerCapture() {}, hasPointerCapture: () => true,
    addEventListener(kind: string, fn: any) { this.events.set(kind, fn); },
    append(...values: any[]) { this.children.push(...values); }, replaceChildren(...values: any[]) { this.children = values; },
    getContext: () => context, getBoundingClientRect: () => ({ left: 0, width: 800, height: 36 }), querySelector: () => create()
  });
  const element = (id: string) => {
    assert.ok(!['enable-b', 'cursor-b', 'delta'].includes(id), `Removed control ${id} must never be accessed`);
    if (!elements.has(id)) elements.set(id, create());
    return elements.get(id);
  };
  vm.runInNewContext(compiled.outputFiles[0].text, {
    acquireVsCodeApi: () => ({ postMessage: (m: any) => sent.push(m), getState: () => ({ a: '3', b: 'invalid-old-state' }), setState: (s: any) => { stored = s; } }),
    document: { body: create(), getElementById: element, createElement: (n: string) => create(n.toUpperCase()), querySelectorAll: () => [], querySelector: () => undefined },
    window: { innerWidth: 1200, devicePixelRatio: 1, addEventListener: (kind: string, fn: any) => listeners.set(kind, fn) },
    ResizeObserver: class { observe() {} }, MutationObserver: class { observe() {} },
    getComputedStyle: () => ({ getPropertyValue: () => '#abcdef' }), setTimeout: () => 1, clearTimeout() {}
  });
  const receive = (data: any) => listeners.get('message')({ data });
  const metadata = parseVcd('$timescale 1ps $end $scope module tb $end $var wire 1 ! clk $end $upscope $end $enddefinitions $end #0 0! #10 1!');
  receive({ kind: 'init', name: 'wave.vcd', metadata, views: {} });
  assert.equal(stored.a, '3', 'Invalid legacy B must not reset the valid cursor');
  assert.ok(!Object.hasOwn(stored, 'b'));
  const pointer = (x: number, extra = {}) => ({ button: 0, pointerId: 1, clientX: x, shiftKey: true, preventDefault() {}, ...extra });
  const ruler = element('ruler');
  element('gesture').value = 'cursor';
  ruler.events.get('pointerdown')(pointer(400));
  assert.equal(stored.a, '5', 'Shift no longer creates a second cursor');
  listeners.get('keydown')({ key: 'Escape', preventDefault() {} });
  assert.equal(stored.a, '3', 'Escape restores the prior cursor');
  ruler.events.get('pointerdown')(pointer(400));
  ruler.events.get('pointerup')(pointer(400));
  assert.equal(stored.a, '5');
  element('gesture').value = 'zoom';
  ruler.events.get('pointerdown')(pointer(160));
  ruler.events.get('pointermove')(pointer(640));
  ruler.events.get('pointerup')(pointer(640));
  assert.equal(stored.from, '2'); assert.equal(stored.to, '8'); assert.equal(stored.a, '5');
  element('snap').onclick();
  const request = sent.at(-1);
  assert.equal(request.kind, 'edge'); assert.equal(request.time, '5'); assert.equal(request.direction, 0);
  receive({ kind: 'edge', requestId: request.requestId, result: '10' });
  assert.equal(stored.a, '10', 'Snap in zoom mode still moves the only cursor');
  assert.ok(!Object.hasOwn(stored, 'b'));
  const before = { from: stored.from, to: stored.to, a: stored.a };
  ruler.events.get('pointerdown')(pointer(160));
  ruler.events.get('pointermove')(pointer(640));
  listeners.get('blur')();
  assert.deepEqual({ from: stored.from, to: stored.to, a: stored.a }, before, 'Focus loss cancels a zoom selection');
});
