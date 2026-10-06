import { LIMITS, type Change, type WaveData, type WaveRow, type WaveWindow, type WindowRequest, type ValuesRequest, type WaveValues } from './model';
export function upperBound(changes: Change[], tick: bigint): number {
  let low = 0, high = changes.length;
  while (low < high) { const mid = (low + high) >>> 1; if (BigInt(changes[mid].time) <= tick) low = mid + 1; else high = mid; }
  return low;
}
export const valueAt = (changes: Change[], tick: bigint, fallback = 'x') => changes[upperBound(changes, tick) - 1]?.value ?? fallback;
const integer = (value: unknown) => { if (typeof value !== 'string' || !/^\d{1,40}$/.test(value)) throw Error('Invalid waveform time.'); return BigInt(value); };
/** Observations only: no viewport transitions or synthetic tick after an end=0 trace. */
export function queryValues(data: WaveData, request: ValuesRequest): WaveValues {
  const cursor = integer(request.cursor);
  if (cursor > BigInt(data.end) || !Array.isArray(request.signals) || request.signals.length > LIMITS.selected || new Set(request.signals).size !== request.signals.length) throw Error('Invalid waveform values request.');
  const signals = new Map(data.signals.map(signal => [signal.id, signal]));
  return { cursor: String(cursor), rows: request.signals.map(id => {
    const signal = signals.get(id); if (!signal) throw Error('Unknown waveform signal.');
    const fallback = signal.type === 'real' || signal.type === 'realtime' ? '?' : 'x'.repeat(signal.width);
    return { id, value: valueAt(data.channels.get(signal.code)!, cursor, fallback) };
  }) };
}
export function queryWindow(data: WaveData, request: WindowRequest): WaveWindow {
  const from = integer(request.from), to = integer(request.to), cursor = integer(request.cursor), end = BigInt(data.end) || 1n;
  if (from >= to || to > end || cursor > end || !Array.isArray(request.signals) || request.signals.length > LIMITS.selected || new Set(request.signals).size !== request.signals.length || !Number.isInteger(request.pixels) || request.pixels < 1 || request.pixels > LIMITS.pixels) throw Error('Invalid waveform window.');
  // Request-local boundaries are shared by equal-density rows; never retained
  // across queries. Adjacent buckets reuse the previous upper-bound index.
  const boundaries = new Map<number, { tick: bigint; text: string }[]>();
  const rows: WaveRow[] = request.signals.map(id => {
    const signal = data.signals.find(s => s.id === id); if (!signal) throw Error('Unknown waveform signal.');
    const list = data.channels.get(signal.code)!, fallback = signal.type === 'real' || signal.type === 'realtime' ? '?' : 'x'.repeat(signal.width);
    const a = upperBound(list, from), b = upperBound(list, to);
    // Bound transport size as well as transition count, including repeated aliases of wide buses.
    const entries = Math.max(1, Math.min(request.pixels * 2, Math.floor(2 * 1024 * 1024 / Math.max(1, request.signals.length) / Math.max(signal.width, 64))));
    const cells = Math.min(request.pixels, entries);
    const row: WaveRow = { id, value: valueAt(list, cursor, fallback), initial: valueAt(list, from, fallback), changes: [], dense: b - a > entries };
    if (!row.dense) row.changes = list.slice(a, b);
    else {
      row.buckets = [];
      let ticks = boundaries.get(cells);
      if (!ticks) {
        ticks = Array.from({ length: cells + 1 }, (_, i) => { const tick = from + (to - from) * BigInt(i) / BigInt(cells); return { tick, text: String(tick) }; });
        boundaries.set(cells, ticks);
      }
      let leftIndex = a;
      for (let i = 0; i < cells; i++) {
        const rightIndex = upperBound(list, ticks[i + 1].tick);
        row.buckets.push({ from: ticks[i].text, to: ticks[i + 1].text, value: list[rightIndex - 1]?.value ?? fallback, edges: rightIndex - leftIndex });
        leftIndex = rightIndex;
      }
    }
    return row;
  });
  return { from: request.from, to: request.to, cursor: request.cursor, rows };
}
export function adjacentChange(data: WaveData, id: string, time: string, direction: number): string | undefined {
  const tick = integer(time), signal = data.signals.find(s => s.id === id);
  if (!signal || ![-1, 0, 1].includes(direction)) throw Error('Invalid edge request.');
  const changes = data.channels.get(signal.code)!;
  if (direction === 0) {
    const after = upperBound(changes, tick), before = changes[after - 1], next = changes[after];
    if (!before) return next?.time;
    if (!next) return before.time;
    // Inclusive nearest lookup, with ties resolved toward the earlier change.
    return tick - BigInt(before.time) <= BigInt(next.time) - tick ? before.time : next.time;
  }
  const index = direction === 1 ? upperBound(changes, tick) : upperBound(changes, tick - 1n) - 1;
  return changes[index]?.time;
}
