import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';
import { parseVcd } from '@rtl-dev/waveform';

test('actual waveform script follows peer cursor without echo and rejects stale tokens/revisions', async () => {
  const compiled = await build({ entryPoints: ['packages/vscode/src/webview/waveform.ts'], bundle: true, platform: 'browser', format: 'iife', write: false });
  const elements = new Map<string, any>(), sent: any[] = [], listeners = new Map<string, any>(), timers = new Map<number, () => void>(); let timer = 0;
  const canvasContext = new Proxy({ measureText: (text: string) => ({ width: text.length * 7 }) } as any, { get: (object, key) => object[key] ?? (() => {}) });
  const create = (tagName = 'DIV') => ({ tagName, value: '', checked: false, disabled: false, textContent: '', title: '', dataset: {}, style: {}, children: [] as any[], clientWidth: 800, clientHeight: 36,
    classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, addEventListener() {}, append(...children: any[]) { this.children.push(...children); }, replaceChildren(...children: any[]) { this.children = children; },
    getContext: () => canvasContext, getBoundingClientRect: () => ({ width: 800, height: 36, left: 0, top: 0 }), querySelector() { return create(); } });
  const element = (id: string) => { if (!elements.has(id)) elements.set(id, create()); return elements.get(id)!; };
  const body = create(), observer = class { observe() {} };
  vm.runInNewContext(compiled.outputFiles[0].text, {
    acquireVsCodeApi: () => ({ postMessage: (message: any) => sent.push(message), getState: () => undefined, setState() {} }),
    document: { body, getElementById: element, createElement: (name: string) => create(name.toUpperCase()), querySelectorAll: () => [], querySelector: () => undefined },
    window: { innerWidth: 1200, devicePixelRatio: 1, addEventListener: (kind: string, listener: any) => listeners.set(kind, listener) },
    ResizeObserver: observer, MutationObserver: observer, getComputedStyle: () => ({ getPropertyValue: () => '#abcdef' }),
    setTimeout: (job: () => void) => { timers.set(++timer, job); return timer; }, clearTimeout: (id: number) => timers.delete(id)
  });
  const receive = (message: any) => listeners.get('message')({ data: message });
  const flush = () => { const jobs = [...timers.values()]; timers.clear(); jobs.forEach(job => job()); };
  const metadata = parseVcd('$timescale 1 ps $end $scope module tb $end $var wire 1 ! clk $end $upscope $end $enddefinitions $end #0 0! #10 1!');
  const link = { token: 'page-a', state: 'ready', time: '0', revision: 0, runId: 'run-a' };
  receive({ kind: 'init', name: 'wave.vcd', metadata, views: {}, link }); flush();
  assert.equal(element('cursor-a').textContent, '0 ps'); assert.match(element('trace-link').textContent, /run-a/);
  receive({ kind: 'traceCursor', link: { ...link, time: '5', revision: 1 } }); flush();
  assert.equal(element('cursor-a').textContent, '5 ps'); assert.equal(sent.filter(m => m.kind === 'traceCursor').length, 0, 'Peer cursor must not echo back');
  element('go-time').value = '6 ps'; element('time-form').onsubmit({ preventDefault() {} }); flush();
  assert.equal(sent.filter(m => m.kind === 'traceCursor').at(-1).time, '6'); assert.equal(sent.at(-1).request.cursor, '6');
  receive({ kind: 'traceCursor', link: { ...link, time: '1', revision: 0 } }); assert.equal(element('cursor-a').textContent, '6 ps');
  receive({ kind: 'traceCursor', link: { ...link, token: 'other', time: '1', revision: 100 } }); assert.equal(element('cursor-a').textContent, '6 ps');
  const preset = { id: 'clock', name: 'Clock', radix: 'hex', signals: [{ path: 'tb.clk' }] };
  receive({ kind: 'views', views: { book: { version: 1, views: [preset] }, label: 'Test' }, selectedId: 'clock' });
  const requests = sent.length;
  receive({ kind: 'viewsChanged', views: { book: { version: 1, defaultId: 'other', views: [{ ...preset, name: 'Renamed' }, { ...preset, id: 'other', name: 'Other', signals: [] }] }, label: 'Test' } });
  assert.equal(element('saved-view').value, 'clock', 'Peer default changes must not replace the current selection');
  assert.deepEqual(element('saved-view').children.map((v: any) => v.textContent), ['Custom', 'Renamed', 'Other ★']);
  assert.equal(element('cursor-a').textContent, '6 ps'); assert.equal(sent.length, requests, 'Collection refresh must not request new data or move the cursor');
  receive({ kind: 'viewsChanged', views: { book: { version: 1, views: [] }, label: 'Test' } });
  assert.equal(element('saved-view').value, '', 'A deleted peer preset becomes Custom while retaining signal selection');
  assert.equal(element('trace-rows').children.length, 1); assert.equal(element('cursor-a').textContent, '6 ps');
  receive({ kind: 'loading' });
  receive({ kind: 'init', name: 'wave.vcd', metadata, views: {}, link: { ...link, token: 'page-b', time: '2' } }); flush();
  receive({ kind: 'traceCursor', link: { ...link, time: '9', revision: 100 } }); assert.equal(element('cursor-a').textContent, '2 ps');
});
