/** Development-only bounded UI probe options, shared by host and webview. */
export interface RenderProbe { parents?: number; expanded?: number; from?: string; to?: string; reload?: boolean }
/** Host intervals use one clock; never subtract host and renderer timestamps. */
export function parseHostWindowTiming(value: any): { queueMs: number; windowMs: number } | undefined {
  if (!value || !['queueMs', 'windowMs'].every(key => typeof value[key] === 'number' && Number.isFinite(value[key]) && value[key] >= 0 && value[key] <= 120_000)) return undefined;
  return { queueMs: value.queueMs, windowMs: value.windowMs };
}
export function parseRenderProbe(value: unknown): RenderProbe {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid renderer probe.');
  const input = value as Record<string, unknown>;
  for (const key of ['parents', 'expanded']) if (input[key] !== undefined && (!Number.isInteger(input[key]) || Number(input[key]) < (key === 'parents' ? 1 : 0) || Number(input[key]) > 32)) throw Error('Invalid renderer row count.');
  for (const key of ['from', 'to']) if (input[key] !== undefined && (typeof input[key] !== 'string' || !/^\d{1,40}$/.test(input[key] as string))) throw Error('Invalid renderer range.');
  if ((input.from === undefined) !== (input.to === undefined) || (input.from !== undefined && BigInt(input.from as string) >= BigInt(input.to as string))) throw Error('Invalid renderer range.');
  if (input.reload !== undefined && typeof input.reload !== 'boolean') throw Error('Invalid renderer reload.');
  return { parents: input.parents as number | undefined, expanded: input.expanded as number | undefined,
    from: input.from as string | undefined, to: input.to as string | undefined, reload: input.reload as boolean | undefined };
}

export function parseRenderDetails(value: any) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || !Number.isInteger(value.parentRows) || value.parentRows < 0 || value.parentRows > 32
    || !Number.isInteger(value.denseRows) || value.denseRows < 0 || value.denseRows > value.parentRows
    || typeof value.from !== 'string' || typeof value.to !== 'string' || !/^\d{1,40}$/.test(value.from) || !/^\d{1,40}$/.test(value.to) || BigInt(value.from) >= BigInt(value.to)
    || !Array.isArray(value.bitRows) || value.bitRows.length > 128 || !value.bitRows.every((row: any) => typeof row?.parent === 'string' && row.parent.length <= 16
      && typeof row.offset === 'string' && /^\d{1,3}$/.test(row.offset) && Number(row.offset) <= 127 && typeof row.value === 'string' && /^[01xz]$/.test(row.value))) throw Error('Invalid renderer details.');
  return { from: value.from as string, to: value.to as string, parentRows: value.parentRows as number, denseRows: value.denseRows as number,
    bitRows: value.bitRows.map((row: any) => ({ parent: row.parent as string, offset: row.offset as string, value: row.value as string })) };
}
/** Elapsed panel age is not query latency: long manual sessions remain observable. */
export function validRenderTimings(value: Record<string, unknown>): boolean {
  return ['queryRoundTripMs', 'drawMs', 'initToDrawMs', 'initToFrameMs'].every(key => {
    const duration = value[key];
    return typeof duration === 'number' && Number.isFinite(duration) && duration >= 0
      && duration <= (key.startsWith('initTo') ? 86_400_000 : 120_000);
  });
}
