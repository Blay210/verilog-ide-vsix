/** Lay out exact time labels using measured pixel widths, without overlaps or clipping. */
export function rulerLabels(from: bigint, to: bigint, width: number, format: (tick: bigint) => string, measure: (text: string) => number): { text: string; x: number }[] {
  if (from < 0n || to <= from || !Number.isFinite(width) || width <= 8) return [];
  const labels: { text: string; x: number; right: number; tick: bigint }[] = [];
  // Reserve both ends first, then fill the interior if space remains.
  for (const index of [0, 5, 1, 2, 3, 4]) {
    const tick = from + (to - from) * BigInt(index) / 5n;
    if (labels.some(label => label.tick === tick)) continue;
    const text = format(tick), size = measure(text);
    if (!Number.isFinite(size) || size < 0 || size > width - 8) continue;
    const x = index === 5 ? width - 4 - size : Math.min(width - 4 - size, 4 + width * index / 5);
    const right = x + size;
    if (labels.some(label => x < label.right + 8 && right + 8 > label.x)) continue;
    labels.push({ text, x, right, tick });
  }
  return labels.sort((a, b) => a.x - b.x).map(({ text, x }) => ({ text, x }));
}

/** Readable, zero-aligned 1/2/5 intervals in exact trace ticks. */
export function timelineRuler(from: bigint, to: bigint, width: number, format: (tick: bigint) => string, measure: (text: string) => number): { ticks: { tick: bigint; x: number; major: boolean }[]; labels: { text: string; x: number }[] } {
  const empty = { ticks: [], labels: [] };
  if (from < 0n || to <= from || !Number.isFinite(width) || width <= 8) return empty;
  const span = to - from, count = BigInt(Math.max(1, Math.min(10, Math.floor(width / 90))));
  const desired = (span + count - 1n) / count;
  let power = 1n;
  while (power * 10n < desired) power *= 10n;
  const majorStep = [1n, 2n, 5n, 10n].map(n => n * power).find(n => n >= desired)!;
  let minorStep = majorStep % 5n === 0n ? majorStep / 5n : majorStep % 2n === 0n ? majorStep / 2n : majorStep;
  if (Number(minorStep * 1000000n / span) / 1000000 * width < 8) minorStep = majorStep;
  const ticks: { tick: bigint; x: number; major: boolean }[] = [], labels: { text: string; x: number }[] = [];
  for (let tick = (from + minorStep - 1n) / minorStep * minorStep; tick <= to; tick += minorStep) {
    const x = Number((tick - from) * 1000000n / span) / 1000000 * width, major = tick % majorStep === 0n;
    ticks.push({ tick, x, major });
    if (!major) continue;
    const text = format(tick), size = measure(text);
    if (!Number.isFinite(size) || size < 0 || size > width - 8) continue;
    const left = Math.max(4, Math.min(x + 4, width - 4 - size)), previous = labels.at(-1);
    if (previous && left < previous.x + measure(previous.text) + 8) continue;
    labels.push({ text, x: left });
  }
  return { ticks, labels };
}
