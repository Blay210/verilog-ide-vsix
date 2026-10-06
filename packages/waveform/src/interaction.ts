/** Canvas position to exact trace tick; floating point is confined to pixel coordinates. */
export function positionTime(position: number, width: number, from: bigint, to: bigint, end: bigint): bigint {
  if (!Number.isFinite(position) || !Number.isFinite(width) || width <= 0 || from < 0n || from >= to || end < 0n) throw Error('Invalid waveform position.');
  const fraction = BigInt(Math.round(Math.max(0, Math.min(1, position / width)) * 1000000));
  const tick = from + (to - from) * fraction / 1000000n;
  return tick > end ? end : tick;
}
/** Both drag directions produce the same interval; a zero-width selection is a no-op. */
export function selectionRange(first: bigint, last: bigint): { from: bigint; length: bigint } | undefined {
  if (first < 0n || last < 0n) throw Error('Invalid selection time.');
  if (first === last) return undefined;
  return first < last ? { from: first, length: last - first } : { from: last, length: first - last };
}
