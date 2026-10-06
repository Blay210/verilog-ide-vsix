import type { WaveSignal, WaveRow } from './model';

/** Bound DOM expansion independently of source width and worker transport. */
export const MAX_BIT_ROWS = 128;
export interface BusBit { offset: number; label: string }
export function busBits(signal: WaveSignal): BusBit[] {
  if (signal.width <= 1 || signal.width > MAX_BIT_ROWS || ['real', 'realtime', 'event', 'string'].includes(signal.type)) return [];
  const match = /^\[\s*(-?\d+)\s*:\s*(-?\d+)\s*\]$/.exec(signal.range ?? '');
  let left: number | undefined, direction = -1;
  if (match) {
    const a = BigInt(match[1]), b = BigInt(match[2]);
    if ((a > b ? a - b : b - a) + 1n === BigInt(signal.width) && a >= BigInt(Number.MIN_SAFE_INTEGER) && a <= BigInt(Number.MAX_SAFE_INTEGER) && b >= BigInt(Number.MIN_SAFE_INTEGER) && b <= BigInt(Number.MAX_SAFE_INTEGER)) {
      left = Number(a); direction = a <= b ? 1 : -1;
    }
  }
  return Array.from({ length: signal.width }, (_, position) => ({ offset: signal.width - 1 - position, label: left === undefined ? `bit offset ${signal.width - 1 - position}` : `[${left + direction * position}]` }));
}
export function bitValue(value: string, width: number, offset: number): string {
  if (!/^[01xz]+$/i.test(value) || offset < 0 || offset >= width) return 'x';
  const bits = value.toLowerCase();
  return bits[bits.length - 1 - offset] ?? (/^[xz]/.test(bits) ? bits[0] : '0');
}
/** Projection preserves exact time and never manufactures individual dense edges. */
export function bitRow(row: WaveRow, width: number, offset: number): WaveRow {
  const initial = bitValue(row.initial, width, offset);
  let previous = initial;
  const changes = row.changes.flatMap(change => {
    const value = bitValue(change.value, width, offset);
    if (value === previous) return [];
    previous = value; return [{ time: change.time, value }];
  });
  return { ...row, initial, value: bitValue(row.value, width, offset), changes,
    buckets: row.buckets?.map(bucket => ({ ...bucket, value: bitValue(bucket.value, width, offset) })) };
}
