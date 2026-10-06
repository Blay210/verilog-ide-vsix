import { parseViewBook, resolveView, type ViewBook, type WaveView, positionTime, selectionRange, timelineRuler, formatTime, parseTime, formatValue, formatEnumValue, LIMITS, type WaveMetadata, type WaveSignal, type WaveWindow, type WaveRow, type Radix } from '@rtl-dev/waveform';
import { moveRows, selectRows } from './waveform-order';
import { createRenderProfile } from './render-profile';
import { WindowReuse } from './window-reuse';
const windowReuse = new WindowReuse();
let cursorReuse = false;
let sentWindow: { id: number; request: import('@rtl-dev/waveform').WindowRequest } | undefined;
import { parseRenderProbe } from '../render-probe';
import { busBits, bitRow, bitValue, formatRulerTime, MAX_BIT_ROWS } from '@rtl-dev/waveform';
declare function acquireVsCodeApi(): { postMessage(message: unknown): void; getState(): any; setState(state: unknown): void };
const api = acquireVsCodeApi();
const renderProfile = createRenderProfile(message => api.postMessage(message), () => performance.now(),
  callback => requestAnimationFrame(callback), () => document.visibilityState === 'visible');
const element = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const status = (message: string, error = false) => { element('status').textContent = message; element('status').classList.toggle('error', error); };
let metadata: WaveMetadata | undefined, selected: string[] = [], focus = '', radix: Radix = 'auto';
let from = 0n, to = 1n, a = 0n, end = 1n, fileEnd = 0n;
let view: WaveWindow | undefined, sequence = 0, expected = 0, timer: ReturnType<typeof setTimeout> | undefined;
let saved = api.getState();
let traceLink: { token: string; state?: string; time?: string; revision?: number; runId?: string } | undefined;
let viewBook: ViewBook = { version: 1, views: [] }, viewId: string | undefined, viewsReady = false, viewEditing = false;
let viewReason = '', viewLabel = '', viewError = '';
let rowSelection: string[] = [], rowAnchor: string | undefined, movingRows: string[] | undefined;
const expanded = new Set<string>();
function restoreExpansion(paths: unknown) {
  expanded.clear(); let count = 0, omitted = 0;
  if (Array.isArray(paths)) for (const id of selected) {
    const signal = signals.get(id)!;
    if (!paths.includes(signal.path)) continue;
    const bits = busBits(signal);
    if (!bits.length || count + bits.length > MAX_BIT_ROWS) { omitted++; continue; }
    expanded.add(signal.path); count += bits.length;
  }
  if (omitted) viewError = `${omitted} bus expansion(s) unavailable: at most 128 bit rows; unsupported widths remain folded.`;
}
const currentView = () => viewBook.views.find(v => v.id === viewId);
function captureView() { return { radix, signals: selected.map(id => ({ path: signals.get(id)!.path, ...signalStyle(id), expanded: expanded.has(signals.get(id)!.path) || undefined })) }; }
function updateViewControls() {
  const preset = currentView(), choice = element<HTMLSelectElement>('saved-view'); choice.replaceChildren();
  const custom = document.createElement('option'); custom.value = ''; custom.textContent = 'Custom'; choice.append(custom);
  for (const v of viewBook.views) { const option = document.createElement('option'); option.value = v.id; option.textContent = `${v.name}${viewBook.defaultId === v.id ? ' ★' : ''}`; choice.append(option); }
  choice.value = preset?.id ?? ''; choice.disabled = !viewsReady || viewEditing;
  element<HTMLButtonElement>('save-view').disabled = !viewsReady || !metadata || viewEditing;
  for (const id of ['default-view', 'manage-view']) element<HTMLButtonElement>(id).disabled = !viewsReady || !preset || viewEditing;
  element('default-view').textContent = preset && viewBook.defaultId === preset.id ? 'Default ✓' : 'Use as default';
  element('default-view').title = preset && viewBook.defaultId === preset.id ? 'Remove this default for future runs' : 'Apply the saved version automatically to future runs of this test';
  element('view-context').textContent = viewLabel; element('view-context').title = viewLabel;
  const missing = preset && metadata ? resolveView(preset, metadata.signals).missing : [];
  const available = new Set(metadata?.signals.map(s => s.path));
  const expected = preset ? { radix: preset.radix, signals: preset.signals.filter(s => available.has(s.path)) } : undefined;
  const dirty = expected && JSON.stringify(expected) !== JSON.stringify(captureView());
  if (dirty) { element<HTMLButtonElement>('default-view').disabled = true; element('default-view').title = 'Save your changes before changing the default.'; }
  const note = viewError || (!viewsReady ? viewReason : [dirty ? 'Unsaved changes' : preset ? 'Saved view' : 'Custom selection', missing.length ? `${missing.length} missing signal(s) — retained in saved view` : ''].filter(Boolean).join(' · '));
  element('view-note').textContent = note; element('view-note').title = missing.join('\n') || note;
}
function receiveViews(value: any) {
  viewError = ''; viewLabel = value?.label ?? ''; viewReason = value?.reason ?? 'Saved views are unavailable for this trace.';
  viewsReady = !!value?.book; viewBook = parseViewBook(value?.book);
}
function applyView(preset: WaveView) {
  if (!metadata) return;
  cancelDrag(); selected = resolveView(preset, metadata.signals).selected; styles.clear();
  for (const s of preset.signals) styles.set(s.path, { radix: s.radix, color: s.color });
  radix = preset.radix; element<HTMLSelectElement>('radix').value = radix; viewId = preset.id; viewError = '';
  restoreExpansion(preset.signals.filter(s => s.expanded).map(s => s.path));
  catalogue(); rebuildRows(); requestWindow();
}

type SignalStyle = { radix?: Radix; color?: 'blue' | 'pink' | 'amber' };
const styles = new Map<string, SignalStyle>();
let drag: { canvas: HTMLCanvasElement; pointer: number; first: bigint; last: bigint; mode: string; a: bigint } | undefined;
const signalStyle = (id: string) => styles.get(signals.get(id)?.path ?? '') ?? {};
const signalRadix = (id: string) => signalStyle(id).radix ?? radix;
function focusSignal(id: string) {
  focus = selected.includes(id) ? id : selected[0] ?? '';
  const signal = signals.get(focus);
  element('focused-signal').textContent = signal?.path ?? 'Select a signal';
  element('focused-signal').title = signal?.path ?? '';
  element<HTMLSelectElement>('signal-radix').value = signalStyle(focus).radix ?? 'default';
  element<HTMLSelectElement>('signal-color').value = signalStyle(focus).color ?? 'default';
  for (const id of ['signal-radix', 'signal-color', 'reset-signal', 'snap', 'previous', 'next']) (element(id) as HTMLButtonElement).disabled = !signal;
  document.querySelectorAll<HTMLElement>('.trace').forEach(r => r.classList.toggle('focused', r.dataset.id === focus));
}

const signals = new Map<string, WaveSignal>();
const clamp = (x: bigint, lo: bigint, hi: bigint) => x < lo ? lo : x > hi ? hi : x;
const span = () => to - from;
const time = (value: bigint) => metadata ? formatTime(value, metadata.timescale) : '';
const rulerTime = (value: bigint) => metadata ? formatRulerTime(value, metadata.timescale) : '';
const real = (signal: WaveSignal) => ['real', 'realtime'].includes(signal.type);
const save = () => { if (metadata) { saved = { viewId, paths: selected.map(id => signals.get(id)!.path), expanded: [...expanded], styles: [...styles.entries()], radix, from: String(from), to: String(to), a: String(a) }; api.setState(saved); updateViewControls(); } };
function cursorLabels() {
  element('cursor-a').textContent = time(a);
  element('range').textContent = `${time(from)} — ${time(to)}`;
}
function requestWindow() {
  if (!metadata) return;
  expected = ++sequence; const id = expected; clearTimeout(timer); cursorLabels(); save();
  if (traceLink?.state === 'ready' && traceLink.time !== String(a)) api.postMessage({ kind: 'traceCursor', token: traceLink.token, time: String(a) });
  for (const label of document.querySelectorAll<HTMLElement>('.trace-value')) label.textContent = '…';
  timer = setTimeout(() => {
    const request = { signals: [...selected], from: String(from), to: String(to), cursor: String(a), pixels: Math.min(LIMITS.pixels, Math.max(1, Math.round(element('ruler').clientWidth))) };
    sentWindow = { id, request }; renderProfile.request(id, String(a));
    api.postMessage({ kind: cursorReuse && windowReuse.matches(request) ? 'values' : 'window', requestId: id, request });
  }, 16);
}
function catalogue() {
  const container = element('catalogue'); container.replaceChildren();
  const query = element<HTMLInputElement>('search').value.toLowerCase();
  const scope = element<HTMLSelectElement>('scope-filter').value;
  const found = metadata?.signals.filter(s => (!scope || s.scope === scope || s.scope.startsWith(scope + '.')) && s.path.toLowerCase().includes(query)) ?? [];
  element('signal-count').textContent = `${selected.length} / ${metadata?.signals.length ?? 0}`;
  for (const signal of found.slice(0, 200)) {
    const label = document.createElement('label'); label.className = 'signal-option'; label.title = signal.path;
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = selected.includes(signal.id); checkbox.setAttribute('aria-label', signal.path);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked && selected.length >= LIMITS.selected) { checkbox.checked = false; status('Up to 32 signals per view. Remove a signal to add another.', true); return; }
      selected = checkbox.checked ? [...selected, signal.id] : selected.filter(id => id !== signal.id); focus = signal.id;
      if (!checkbox.checked) expanded.delete(signal.path);
      rebuildRows(); catalogue(); requestWindow();
    });
    const info = document.createElement('span'); info.className = 'label';
    const name = document.createElement('span'); name.className = 'name'; name.textContent = signal.name;
    const scope = document.createElement('small'); scope.textContent = signal.scope || 'Root'; info.append(name, scope);
    const width = document.createElement('span'); width.className = 'width'; width.textContent = real(signal) ? 'real' : `${signal.width}b`;
    label.append(checkbox, info, width); container.append(label);
  }
  element('search-info').textContent = found.length > 200 ? `Showing 200 of ${found.length}. Refine your search.` : `${found.length} signals · aliases share trace data`;
}
function rebuildRows() {
  const container = element('trace-rows'), scroll = element('traces');
  const scrollTop = scroll.scrollTop; container.replaceChildren();
  rowSelection = rowSelection.filter(id => selected.includes(id));
  if (!selected.includes(focus)) focus = selected[0] ?? '';
  for (const id of selected) {
    const signal = signals.get(id)!;
    const row = document.createElement('div'); row.className = 'trace'; row.dataset.id = id; row.classList.toggle('focused', id === focus);
    const label = document.createElement('div'); label.className = 'trace-label'; label.title = signal.path;
    label.tabIndex = 0; label.draggable = true; label.setAttribute('role', 'option');
    label.setAttribute('aria-label', `${signal.path}. Click to select; Ctrl or Shift for multiple; drag to reorder.`);
    const select = (event: MouseEvent | KeyboardEvent) => {
      const next = selectRows(selected, rowSelection, rowAnchor, id, event.ctrlKey || event.metaKey, event.shiftKey);
      rowSelection = next.ids; rowAnchor = next.anchor; focusSignal(id); updateRowSelection();
    };
    let rowPointer: { id: number; x: number; y: number; active: boolean } | undefined;
    let ignoreClick = false;
    const clearRowDrop = () => document.querySelectorAll('.trace').forEach(item => item.classList.remove('drop-before', 'drop-after'));
    const dropLabel = (x: number, y: number) => document.elementFromPoint(x, y)?.closest<HTMLElement>('.trace-label');
    label.addEventListener('click', event => { event.stopPropagation(); if (!ignoreClick) select(event); });
    // Pointer capture keeps reordering inside the webview, including iframe-hosted editors.
    label.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      rowPointer = { id: event.pointerId, x: event.clientX, y: event.clientY, active: false };
      label.focus({ preventScroll: true });
      label.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    label.addEventListener('pointermove', event => {
      if (!rowPointer || rowPointer.id !== event.pointerId) return;
      if (!rowPointer.active && Math.hypot(event.clientX - rowPointer.x, event.clientY - rowPointer.y) < 4) return;
      rowPointer.active = true;
      if (!movingRows) {
        if (!rowSelection.includes(id)) { rowSelection = [id]; rowAnchor = id; }
        movingRows = selected.filter(value => rowSelection.includes(value)); updateRowSelection();
      }
      clearRowDrop();
      const target = dropLabel(event.clientX, event.clientY), targetRow = target?.parentElement;
      if (!target || !targetRow || movingRows.includes(targetRow.dataset.id ?? '')) return;
      const rect = target.getBoundingClientRect();
      targetRow.classList.add(event.clientY >= rect.top + rect.height / 2 ? 'drop-after' : 'drop-before');
    });
    label.addEventListener('pointerup', event => {
      if (!rowPointer || rowPointer.id !== event.pointerId) return;
      const active = rowPointer.active; rowPointer = undefined;
      if (label.hasPointerCapture(event.pointerId)) label.releasePointerCapture(event.pointerId);
      if (active && movingRows) {
        const target = dropLabel(event.clientX, event.clientY), targetId = target?.parentElement?.dataset.id;
        if (target && targetId) {
          const rect = target.getBoundingClientRect();
          selected = moveRows(selected, movingRows, targetId, event.clientY >= rect.top + rect.height / 2);
        }
        ignoreClick = true; setTimeout(() => { ignoreClick = false; }, 0);
        movingRows = undefined; clearRowDrop(); rebuildRows(); catalogue(); requestWindow();
      }
    });
    for (const kind of ['pointercancel', 'lostpointercapture']) label.addEventListener(kind, () => {
      if (!rowPointer) return; rowPointer = undefined; movingRows = undefined; clearRowDrop();
    });
    label.addEventListener('keydown', event => {
      if (event.key === 'Escape' && rowPointer) {
        const pointer = rowPointer.id; rowPointer = undefined; movingRows = undefined; clearRowDrop();
        if (label.hasPointerCapture(pointer)) label.releasePointerCapture(pointer);
        event.preventDefault(); event.stopPropagation(); return;
      }
      if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); select(event); }
    });
    label.addEventListener('dragstart', event => {
      if (!rowSelection.includes(id)) { rowSelection = [id]; rowAnchor = id; }
      movingRows = selected.filter(value => rowSelection.includes(value)); updateRowSelection();
      if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', signal.path); }
    });
    label.addEventListener('dragover', event => {
      if (!movingRows || movingRows.includes(id)) return;
      event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      const after = event.clientY >= label.getBoundingClientRect().top + label.getBoundingClientRect().height / 2;
      row.classList.toggle('drop-before', !after); row.classList.toggle('drop-after', after);
    });
    label.addEventListener('dragleave', () => { row.classList.remove('drop-before', 'drop-after'); });
    label.addEventListener('drop', event => {
      event.preventDefault(); if (!movingRows) return;
      const rect = label.getBoundingClientRect();
      selected = moveRows(selected, movingRows, id, event.clientY >= rect.top + rect.height / 2); movingRows = undefined;
      rebuildRows(); catalogue(); requestWindow();
    });
    label.addEventListener('dragend', () => { movingRows = undefined; document.querySelectorAll('.trace').forEach(row => row.classList.remove('drop-before', 'drop-after')); });
    const name = document.createElement('span'); name.className = 'trace-name'; name.textContent = signal.name;
    const value = document.createElement('span'); value.className = 'trace-value'; value.textContent = '…'; value.setAttribute('aria-label', `Value of ${signal.path}`);
    if (signal.width > 1 && !real(signal)) {
      const toggle = document.createElement('button'); toggle.className = 'bus-toggle';
      const open = expanded.has(signal.path), bits = busBits(signal);
      toggle.textContent = open ? '▾' : '▸'; toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', `${open ? 'Collapse' : 'Expand'} bits of ${signal.path}`);
      toggle.disabled = !bits.length; toggle.title = bits.length ? 'Expand/collapse individual bits' : 'Bit expansion supports integral buses up to 128 bits.';
      toggle.addEventListener('pointerdown', event => event.stopPropagation());
      toggle.addEventListener('keydown', event => event.stopPropagation());
      toggle.addEventListener('click', event => {
        event.stopPropagation();
        const total = selected.reduce((sum, id) => sum + (expanded.has(signals.get(id)!.path) ? busBits(signals.get(id)!).length : 0), 0);
        if (open) expanded.delete(signal.path);
        else if (total + bits.length <= MAX_BIT_ROWS) expanded.add(signal.path);
        else { status('Up to 128 expanded bit rows. Fold another bus first.', true); return; }
        rebuildRows(); requestWindow();
      });
      label.append(toggle);
    }
    label.append(name, value); row.append(label);
    const canvas = document.createElement('canvas'); canvas.setAttribute('aria-label', `Trace ${signal.path}`); row.append(canvas);
    row.addEventListener('click', () => focusSignal(id));
    bindPointer(canvas, id);
    container.append(row);
    if (expanded.has(signal.path)) for (const bit of busBits(signal)) {
      const child = document.createElement('div'); child.className = 'trace bit-trace'; child.dataset.parent = id; child.dataset.offset = String(bit.offset);
      const caption = document.createElement('div'); caption.className = 'trace-label bit-label'; caption.title = `${signal.path} · ${bit.label}`;
      const bitName = document.createElement('span'); bitName.className = 'trace-name'; bitName.textContent = bit.label;
      const bitValue = document.createElement('span'); bitValue.className = 'trace-value'; bitValue.textContent = '…'; caption.append(bitName, bitValue);
      child.append(caption); const canvas = document.createElement('canvas'); canvas.setAttribute('aria-label', `Trace ${signal.path} ${bit.label}`); child.append(canvas);
      caption.addEventListener('click', () => focusSignal(id)); bindPointer(canvas, id); container.append(child);
    }
  }
  element('empty').style.display = selected.length ? 'none' : 'block';
  focusSignal(focus);
  updateRowSelection();
  scroll.scrollTop = scrollTop;
}
function updateRowSelection() {
  document.querySelectorAll<HTMLElement>('.trace').forEach(row => {
    const chosen = rowSelection.includes(row.dataset.id ?? ''); row.classList.toggle('selected', chosen);
    row.querySelector('.trace-label')?.setAttribute('aria-selected', String(chosen));
  });
}
function cancelDrag() {
  if (!drag) return;
  const old = drag; drag = undefined;
  if (old.canvas.hasPointerCapture(old.pointer)) old.canvas.releasePointerCapture(old.pointer);
  a = old.a; requestWindow();
}
function bindPointer(canvas: HTMLCanvasElement, id?: string) {
  const tick = (event: PointerEvent) => { const rect = canvas.getBoundingClientRect(); return positionTime(event.clientX - rect.left, rect.width, from, to, fileEnd); };
  canvas.addEventListener('pointerdown', event => {
    if (!metadata || event.button !== 0 || drag) return;
    event.preventDefault(); if (id) focusSignal(id);
    element('traces').focus({ preventScroll: true });
    const point = tick(event), mode = element<HTMLSelectElement>('gesture').value === 'zoom' ? 'zoom' : 'cursor';
    drag = { canvas, pointer: event.pointerId, first: point, last: point, mode, a };
    canvas.setPointerCapture(event.pointerId);
    if (mode !== 'zoom') { a = point; requestWindow(); } else draw();
  });
  canvas.addEventListener('pointermove', event => {
    if (!drag || drag.canvas !== canvas || drag.pointer !== event.pointerId) return;
    drag.last = tick(event);
    if (drag.mode === 'zoom') { draw(); status(`Zoom selection: ${time(drag.first)} — ${time(drag.last)} · Esc to cancel`); }
    else { a = drag.last; requestWindow(); }
  });
  canvas.addEventListener('pointerup', event => {
    if (!drag || drag.canvas !== canvas || drag.pointer !== event.pointerId) return;
    const done = drag; done.last = tick(event); drag = undefined;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (done.mode === 'zoom') { const interval = selectionRange(done.first, done.last); if (interval) range(interval.from, interval.length); else requestWindow(); }
    else { a = done.last; requestWindow(); }
  });
  for (const event of ['pointercancel', 'lostpointercapture']) canvas.addEventListener(event, () => { if (drag?.canvas === canvas) cancelDrag(); });
}
function range(start: bigint, length: bigint) {
  const size = clamp(length, 1n, end); from = clamp(start, 0n, end - size); to = from + size; requestWindow();
}
function zoom(inside: boolean) {
  const center = a >= from && a <= to ? a : (from + to) / 2n;
  const size = inside ? (span() / 2n || 1n) : span() * 2n; range(center - size / 2n, size);
}
function setCursor(tick: bigint) {
  a = clamp(tick, 0n, fileEnd);
  if (a < from || a > to) range(a - span() / 2n, span()); else requestWindow();
}
function setup(canvas: HTMLCanvasElement, width: number, height: number) {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext('2d')!; ctx.scale(ratio, ratio); ctx.clearRect(0, 0, width, height); ctx.font = '11px Consolas, monospace';
  return { ctx, width, height };
}
function draw() {
  if (!metadata || !view || view.from !== String(from) || view.to !== String(to) || view.cursor !== String(a)) return;
  // Read layout/theme before any label/backing-store writes. Alternating those
  // writes with clientWidth reads forces repeated layout at maximum bit rows.
  const { sizes, colors } = renderProfile.measure('prepareMs', () => {
    const ruler = element<HTMLCanvasElement>('ruler'), viewport = element('traces').getBoundingClientRect();
    const top = ruler.getBoundingClientRect().bottom, bottom = viewport.bottom;
    const canvases = [ruler, ...Array.from(element('trace-rows').children).map(row => row.querySelector<HTMLCanvasElement>('canvas')).filter((canvas): canvas is HTMLCanvasElement => !!canvas)];
    // Keep all labels exact, but project and paint only the viewport plus one
    // row of overscan. Scroll/reveal redraw from the current validated window.
    const sizes = new Map(canvases.filter(canvas => {
      if (canvas === ruler) return true;
      const rect = canvas.getBoundingClientRect(); return rect.bottom >= top - 43 && rect.top <= bottom + 43;
    }).map(canvas => [canvas, { width: Math.max(1, canvas.clientWidth), height: canvas.clientHeight }]));
    const style = getComputedStyle(document.body);
    const colors = new Map(['--line', '--muted', '--wave', '--unknown', '--z', '--cursor', '--signal-blue', '--signal-pink', '--signal-amber'].map(name => [name, style.getPropertyValue(name).trim()]));
    return { sizes, colors };
  });
  const color = (name: string) => colors.get(name) ?? '';
  const rulers = new Map<number, ReturnType<typeof timelineRuler>>();
  // Shared normalized positions for bus/bit rows in this draw only. Preserve
  // the existing BigInt truncation, and bound unique-time cache growth.
  const positions = new Map<string, number>();
  const position = (tick: string) => {
    const known = positions.get(tick); if (known !== undefined) return known;
    const result = Number((BigInt(tick) - from) * 1000000n / span()) / 1000000;
    if (positions.size < 4096) positions.set(tick, result); return result;
  };
  const plot = (canvas: HTMLCanvasElement, row?: WaveRow, projectedBit = false) => {
    const size = sizes.get(canvas); if (!size) return;
    const { ctx, width, height } = setup(canvas, size.width, size.height), x = (tick: bigint) => Number((tick - from) * 1000000n / span()) / 1000000 * width;
    const xAt = (tick: string) => position(tick) * width;
    ctx.lineWidth = 1; ctx.strokeStyle = color('--line'); ctx.fillStyle = color('--muted');
    let ruler = rulers.get(width);
    if (!ruler) { ruler = timelineRuler(from, to, width, rulerTime, text => Math.max(...text.split('\n').map(line => ctx.measureText(line).width))); rulers.set(width, ruler); }
    for (const tick of ruler.ticks) {
      ctx.globalAlpha = tick.major ? 1 : .35;
      ctx.beginPath(); ctx.moveTo(tick.x, !row && !tick.major ? height - 7 : 0); ctx.lineTo(tick.x, height); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (!row) {
      ctx.textAlign = 'left';
      for (const label of ruler.labels) {
        const lines = label.text.split('\n');
        lines.forEach((line, index) => ctx.fillText(line, label.x, lines.length === 1 ? 22 : 13 + index * 15));
      }
      canvas.title = `${time(from)} — ${time(to)}`;
    }
    if (row) {
      const signal = projectedBit ? { ...signals.get(row.id)!, width: 1 } : signals.get(row.id)!;
      const waveColor = color(signalStyle(row.id).color ? `--signal-${signalStyle(row.id).color}` : '--wave');
      const segment = (start: number, finish: number, value: string) => {
        const left = Math.max(0, start), right = Math.min(width, finish); if (right <= left) return;
        const unknown = !real(signal) && /x/i.test(value), highZ = !real(signal) && /z/i.test(value);
        ctx.strokeStyle = unknown ? color('--unknown') : highZ ? color('--z') : waveColor; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 1.4;
        if (signal.width === 1 && (projectedBit || signalRadix(row.id) !== 'auto' || !metadata?.enumLabels?.[row.id]) && !real(signal) && /^[01]$/.test(value)) {
          const y = value === '1' ? 10 : 31; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
        } else {
          const elbow = Math.min(4, (right - left) / 3);
          ctx.globalAlpha = unknown || highZ ? .12 : .055; ctx.fillRect(left, 9, right - left, 23); ctx.globalAlpha = 1;
          ctx.beginPath(); ctx.moveTo(left, 20); ctx.lineTo(left + elbow, 9); ctx.lineTo(right - elbow, 9); ctx.lineTo(right, 20); ctx.lineTo(right - elbow, 32); ctx.lineTo(left + elbow, 32); ctx.closePath(); ctx.stroke();
          if (right - left > 25) {
            ctx.save(); ctx.beginPath(); ctx.rect(left + 5, 10, Math.max(0, right - left - 10), 23); ctx.clip(); ctx.textAlign = 'center';
            ctx.fillText(formatEnumValue(value, projectedBit ? 'binary' : signalRadix(row.id), projectedBit ? undefined : metadata?.enumLabels?.[row.id], real(signal)).slice(0, 100), (left + right) / 2, 24); ctx.restore();
          }
        }
      };
      if (row.dense) {
        let previous = row.initial;
        for (const bucket of row.buckets ?? []) {
          const left = xAt(bucket.from), right = xAt(bucket.to);
          if (bucket.edges) { ctx.fillStyle = waveColor; ctx.globalAlpha = .32; ctx.fillRect(left, 9, Math.max(1, right - left), 23); ctx.globalAlpha = 1; }
          else segment(left, right, previous);
          previous = bucket.value;
        }
      } else {
        let previous = row.initial, start = String(from);
        for (const change of row.changes) {
          const tick = change.time; segment(xAt(start), xAt(tick), previous);
          if (signal.width === 1 && (projectedBit || signalRadix(row.id) !== 'auto' || !metadata?.enumLabels?.[row.id]) && /^[01]$/.test(previous) && /^[01]$/.test(change.value)) {
            ctx.strokeStyle = waveColor; ctx.beginPath(); ctx.moveTo(xAt(tick), previous === '1' ? 10 : 31); ctx.lineTo(xAt(tick), change.value === '1' ? 10 : 31); ctx.stroke();
          }
          start = tick; previous = change.value;
        }
        segment(xAt(start), width, previous);
      }
    }
    if (drag?.mode === 'zoom') {
      const left = x(drag.first < drag.last ? drag.first : drag.last), right = x(drag.first > drag.last ? drag.first : drag.last);
      ctx.fillStyle = color('--cursor'); ctx.globalAlpha = .18; ctx.fillRect(left, 0, right - left, height); ctx.globalAlpha = 1;
      ctx.strokeStyle = color('--cursor'); ctx.strokeRect(left, 0, right - left, height);
    }
    if (a >= from && a <= to) {
      const tick = a, name = '--cursor';
      ctx.strokeStyle = color(name); ctx.lineWidth = 1; const pos = Math.min(width - 1, Math.max(1, x(tick)));
      ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, height); ctx.stroke();
      if (!row) { ctx.fillStyle = color(name); ctx.beginPath(); ctx.moveTo(pos - 4, 0); ctx.lineTo(pos + 4, 0); ctx.lineTo(pos, 6); ctx.fill(); }
    }
  };
  renderProfile.measure('parentPlotMs', () => plot(element<HTMLCanvasElement>('ruler')));
  for (const row of view.rows) {
    const target = document.querySelector<HTMLElement>(`.trace[data-id="${row.id}"]`); if (!target) continue;
    const signal = signals.get(row.id)!, value = formatEnumValue(row.value, signalRadix(row.id), metadata?.enumLabels?.[row.id], real(signal));
    const label = target.querySelector<HTMLElement>('.trace-value')!; label.textContent = value; label.title = `${time(a)} · ${value} · ${formatValue(row.value, 'hex', real(signal))} · ${row.value}`;
    renderProfile.measure('parentPlotMs', () => plot(target.querySelector('canvas')!, row));
    for (const child of document.querySelectorAll<HTMLElement>(`.bit-trace[data-parent="${row.id}"]`)) {
      const canvas = child.querySelector<HTMLCanvasElement>('canvas')!, offset = Number(child.dataset.offset);
      const value = bitValue(row.value, signal.width, offset);
      const label = child.querySelector<HTMLElement>('.trace-value')!;
      label.textContent = value; label.title = `${time(a)} · ${value}${row.dense ? ' · Dense activity is from the parent bus; zoom in for bit edges.' : ''}`;
      if (sizes.has(canvas)) {
        const projected = renderProfile.measure('bitProjectMs', () => bitRow(row, signal.width, offset));
        renderProfile.measure('bitPlotMs', () => plot(canvas, projected, true));
      }
    }
  }
}
element('search').addEventListener('input', catalogue);
element('scope-filter').onchange = catalogue;
element('saved-view').onchange = () => {
  viewId = element<HTMLSelectElement>('saved-view').value || undefined; const preset = currentView();
  if (preset) applyView(preset); else { viewError = ''; save(); }
};
for (const [id, action] of [['save-view', 'save'], ['default-view', 'default'], ['manage-view', 'manage']] as const) element(id).onclick = () => {
  if (!viewsReady || viewEditing || !metadata) return;
  viewEditing = true; viewError = ''; updateViewControls();
  api.postMessage({ kind: 'viewEdit', action, viewId, view: captureView() });
};
element('fit').onclick = () => range(0n, end);
element('zoom-in').onclick = () => zoom(true); element('zoom-out').onclick = () => zoom(false);
element('pan-left').onclick = () => range(from - (span() / 4n || 1n), span()); element('pan-right').onclick = () => range(from + (span() / 4n || 1n), span());
element('radix').onchange = () => { radix = element<HTMLSelectElement>('radix').value as Radix; save(); draw(); };
element('time-form').onsubmit = event => { event.preventDefault(); if (!metadata) return; try { const value = parseTime(element<HTMLInputElement>('go-time').value, metadata.timescale); if (value > fileEnd) throw Error('Time is outside this trace.'); setCursor(value); } catch (error) { status(String(error), true); } };
element('sidebar-toggle').onclick = () => { document.querySelector('.workspace')!.classList.toggle(window.innerWidth <= 650 ? 'mobile-browser' : 'collapsed'); };
element('reload').onclick = () => api.postMessage({ kind: 'reload' }); element('external').onclick = () => api.postMessage({ kind: 'external' });
for (const [id, direction] of [['previous', -1], ['next', 1]] as const) element(id).onclick = () => { if (focus && metadata) { clearTimeout(timer); expected = ++sequence; api.postMessage({ kind: 'edge', requestId: expected, signal: focus, time: String(a), direction }); } };
bindPointer(element<HTMLCanvasElement>('ruler'));
element('gesture').onchange = cancelDrag;
element('snap').onclick = () => {
  if (!focus || !metadata) return;
  clearTimeout(timer);
  expected = ++sequence;
  api.postMessage({ kind: 'edge', requestId: expected, signal: focus, time: String(a), direction: 0 });
};
for (const id of ['signal-radix', 'signal-color']) element(id).onchange = () => {
  if (!focus) return;
  const r = element<HTMLSelectElement>('signal-radix').value, c = element<HTMLSelectElement>('signal-color').value;
  styles.set(signals.get(focus)!.path, { radix: r === 'default' ? undefined : r as Radix, color: c === 'default' ? undefined : c as SignalStyle['color'] }); save(); draw();
};
element('reset-signal').onclick = () => { if (focus) styles.delete(signals.get(focus)!.path); focusSignal(focus); save(); draw(); };
window.addEventListener('keydown', event => { if (event.key === 'Escape' && drag) { event.preventDefault(); cancelDrag(); } });
window.addEventListener('blur', cancelDrag);

element('traces').addEventListener('keydown', event => {
  if (event.target !== element('traces') || event.ctrlKey || event.metaKey || event.altKey) return;
  if (['+', '=', '-', '0', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault(); if (event.key === '0') range(0n, end); else if (event.key === '-') zoom(false); else if (event.key.startsWith('Arrow')) range(from + (event.key === 'ArrowLeft' ? -1n : 1n) * (span() / 4n || 1n), span()); else zoom(true);
  }
});
element('traces').addEventListener('wheel', event => { if (event.ctrlKey) { event.preventDefault(); zoom(event.deltaY < 0); } }, { passive: false });
let scrollFrame = false, reloadScroll = 0;
element('traces').addEventListener('scroll', () => {
  if (scrollFrame) return; scrollFrame = true;
  requestAnimationFrame(() => { scrollFrame = false; draw(); });
});
const resize = new ResizeObserver(() => { if (metadata) requestWindow(); });
resize.observe(element('ruler')); resize.observe(element('traces'));
new MutationObserver(() => draw()).observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });
window.addEventListener('message', event => {
  let message = event.data;
  if (message.kind === 'traceCursor') {
    if (!metadata || !traceLink || message.link?.token !== traceLink.token || message.link.revision < (traceLink.revision ?? 0)) return;
    traceLink = message.link;
    if (traceLink!.state === 'ready' && traceLink!.time !== String(a)) setCursor(BigInt(traceLink!.time!));
    return;
  }
  if (message.kind === 'views') { receiveViews(message.views); viewId = message.selectedId; save(); updateViewControls(); return; }
  if (message.kind === 'viewsChanged') {
    receiveViews(message.views);
    if (viewId && !currentView()) viewId = undefined;
    save(); updateViewControls(); return;
  }
  if (message.kind === 'viewError') { viewError = message.error; updateViewControls(); return; }
  if (message.kind === 'viewDone') { viewEditing = false; updateViewControls(); return; }
  if (message.kind === 'loading') {
    windowReuse.clear(); sentWindow = undefined;
    if (metadata) reloadScroll = element('traces').scrollTop;
    renderProfile.reset();
    cancelDrag(); clearTimeout(timer); expected = ++sequence; metadata = undefined; view = undefined; traceLink = undefined;
    element('trace-rows').replaceChildren(); element('catalogue').replaceChildren();
    const ruler = element<HTMLCanvasElement>('ruler'); ruler.getContext('2d')?.clearRect(0, 0, ruler.width, ruler.height);
    element('empty').style.display = 'block'; element('empty').textContent = 'Reading waveform…';
    document.body.classList.add('loading'); status('Reading waveform…'); return;
  }
  if (message.kind === 'error') { if (message.requestId !== undefined && message.requestId !== expected) return; windowReuse.clear(); document.body.classList.remove('loading'); if (!metadata) element('empty').textContent = 'Unable to read waveform. Retry Reload or open in GTKWave.'; status(message.error, true); return; }
  if (message.kind === 'init') {
    windowReuse.clear(); sentWindow = undefined; cursorReuse = message.cursorReuse === true;
    renderProfile.reset(typeof message.renderProfile === 'string' ? message.renderProfile : undefined);
    metadata = message.metadata; if (!metadata) return;
    traceLink = message.link;
    receiveViews(message.views); viewId = saved?.viewId;
    const initial = !Array.isArray(saved?.paths) ? viewBook.views.find(v => v.id === viewBook.defaultId) : undefined;
    if (initial) { viewId = initial.id; saved = { paths: initial.signals.map(s => s.path), expanded: initial.signals.filter(s => s.expanded).map(s => s.path), radix: initial.radix, styles: initial.signals.map(s => [s.path, { radix: s.radix, color: s.color }]), viewId }; }
    const hierarchy = element<HTMLSelectElement>('scope-filter'), previousScope = hierarchy.value;
    hierarchy.replaceChildren(); const all = document.createElement('option'); all.value = ''; all.textContent = 'All scopes'; hierarchy.append(all);
    const scopes = new Set(metadata.signals.map(s => s.scope).filter(Boolean));
    for (const scope of [...scopes].sort()) { const option = document.createElement('option'); option.value = scope; option.textContent = scope; hierarchy.append(option); }
    hierarchy.value = scopes.has(previousScope) ? previousScope : '';
    drag = undefined; signals.clear(); metadata.signals.forEach(s => signals.set(s.id, s)); end = BigInt(metadata.end) || 1n; fileEnd = BigInt(metadata.end);
    styles.clear();
    const paths = new Set(metadata.signals.map(s => s.path));
    if (Array.isArray(saved?.styles)) for (const entry of saved.styles.slice(0, LIMITS.signals)) {
      if (!Array.isArray(entry) || !paths.has(entry[0]) || !entry[1] || typeof entry[1] !== 'object') continue;
      const [path, style] = entry;
      styles.set(path, { radix: ['auto', 'hex', 'unsigned', 'signed', 'binary'].includes(style.radix) ? style.radix : undefined, color: ['blue', 'pink', 'amber'].includes(style.color) ? style.color : undefined });
    }
    selected = []; const codes = new Set<string>();
    if (Array.isArray(saved?.paths)) for (const p of saved.paths.slice(0, LIMITS.selected)) { const signal = metadata.signals.find(s => s.path === p); if (signal && !selected.includes(signal.id)) selected.push(signal.id); }
    else for (const s of metadata.signals) if (!codes.has(s.code) && selected.length < 8) { selected.push(s.id); codes.add(s.code); }
    restoreExpansion(saved?.expanded);
    try { from = BigInt(saved?.from ?? '0'); to = BigInt(saved?.to ?? metadata.end); a = clamp(BigInt(saved?.a ?? '0'), 0n, fileEnd); } catch { from = 0n; to = end; a = 0n; }
    if (from < 0n || to > end || from >= to) { from = 0n; to = end; }
    if (traceLink?.state === 'ready') a = clamp(BigInt(traceLink.time!), 0n, fileEnd);
    radix = ['auto', 'hex', 'unsigned', 'signed', 'binary'].includes(saved?.radix) ? saved.radix : 'auto'; element<HTMLSelectElement>('radix').value = radix;
    element('filename').textContent = message.name; element('filename').title = message.name;
    element('file-info').textContent = `VCD · ${metadata.signals.length} signals · ${metadata.changes.toLocaleString()} changes · ${time(fileEnd)}${metadata.warnings.length ? ' · ' + metadata.warnings.join(' ') : ''}`;
    element('file-info').title = element('file-info').textContent!;
    element('trace-link').textContent = traceLink?.state === 'ready' ? `Recorded run ${traceLink.runId} · Cursor linked to structure` : message.link?.reason ?? 'Cursor is not linked to structure.';
    document.body.classList.remove('loading'); element('empty').textContent = 'Choose signals on the left to start exploring.'; catalogue(); rebuildRows(); element('traces').scrollTop = reloadScroll; requestWindow(); return;
  }
  if (message.kind === 'renderProbe' && renderProfile.matches(message.nonce) && typeof message.time === 'string' && /^\d{1,40}$/.test(message.time)) {
    const probe = parseRenderProbe(message.options);
    if (probe.reload) { api.postMessage({ kind: 'reload' }); return; }
    if (probe.parents !== undefined) {
      cancelDrag(); selected = metadata!.signals.slice(0, probe.parents).map(signal => signal.id);
      restoreExpansion(selected.slice(0, probe.expanded ?? 0).map(id => signals.get(id)!.path)); catalogue(); rebuildRows();
    }
    a = clamp(BigInt(message.time), 0n, fileEnd);
    if (probe.from !== undefined) range(BigInt(probe.from), BigInt(probe.to!) - BigInt(probe.from)); else setCursor(a);
    return;
  }
  if (message.requestId !== expected) return;
  if (message.kind === 'values') {
    if (!cursorReuse || !sentWindow || sentWindow.id !== expected) return;
    const merged = windowReuse.merge(sentWindow.request, message.result);
    if (!merged) { windowReuse.clear(); requestWindow(); return; }
    message = { ...message, kind: 'window', result: merged };
  }
  if (message.kind === 'window' && cursorReuse && sentWindow?.id === expected) windowReuse.remember(sentWindow.request, message.result);
  if (message.kind === 'window') { view = message.result; renderProfile.response(message.requestId, view!.rows, draw, () => ({
    from: view!.from, to: view!.to, denseRows: view!.rows.filter(row => row.dense).length,
    parentRows: Array.from(element('trace-rows').children).filter(row => (row as HTMLElement).dataset.id !== undefined && (row as HTMLElement).dataset.parent === undefined).length,
    bitRows: Array.from(element('trace-rows').children).filter(row => (row as HTMLElement).dataset.parent !== undefined).map(row => ({
      parent: (row as HTMLElement).dataset.parent, offset: (row as HTMLElement).dataset.offset, value: row.querySelector('.trace-value')?.textContent
    })).slice(0, MAX_BIT_ROWS)
  }), message.hostTiming); status(view!.rows.some(r => r.dense) ? 'Dense activity — zoom in to resolve individual transitions. Cursor values remain exact.' : `${selected.length} signals · Snapshot · Values at cursor`); }
  if (message.kind === 'edge') { if (message.result !== undefined) { setCursor(BigInt(message.result)); } else { status('No more transitions for the focused signal.'); requestWindow(); } }
});
api.postMessage({ kind: 'ready' });
