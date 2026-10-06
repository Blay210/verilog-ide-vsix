import { parseHostWindowTiming } from '../render-probe';

/** Explicit development diagnostics; frame callbacks indicate paint opportunity,
 * not proof of compositor presentation. Never persist in user view state. */
export function createRenderProfile(send: (message: unknown) => void, now: () => number,
  frame: (callback: () => void) => void, visible: () => boolean) {
  let nonce = '', initialized = 0, latest = 0, count = 0;
  const pending = new Map<number, { at: number; cursor: string }>();
  let phases: Record<string, number> | undefined;
  return {
    measure<T>(name: string, action: () => T): T {
      if (!phases) return action();
      const start = now(); try { return action(); } finally { phases[name] = (phases[name] ?? 0) + now() - start; }
    },
    reset(value?: string) { nonce = value ?? ''; initialized = nonce ? now() : 0; latest = 0; count = 0; pending.clear(); },
    matches(value: string) { return !!nonce && value === nonce; },
    request(id: number, cursor: string) {
      if (!nonce || count >= 16) return;
      if (pending.size >= 32) pending.delete(pending.keys().next().value!);
      pending.set(id, { at: now(), cursor });
    },
    response(id: number, rows: { id: string; value: string }[], draw: () => void, inspect?: () => unknown, timing?: unknown) {
      const sent = pending.get(id);
      if (!nonce || sent === undefined || count >= 16) { draw(); return; }
      pending.delete(id); const received = now(), token = nonce;
      const drawPhases: Record<string, number> = {}; phases = drawPhases;
      try { draw(); } finally { phases = undefined; }
      const drawn = now(); latest = id;
      const sample = { kind: 'renderProfile', nonce: token, requestId: id, ...(inspect ? { details: inspect() } : {}),
        ...(parseHostWindowTiming(timing) ? { hostTiming: parseHostWindowTiming(timing) } : {}),
        queryRoundTripMs: received - sent.at, drawMs: drawn - received, cursor: sent.cursor, ...(Object.keys(drawPhases).length ? { drawPhases } : {}),
        initToDrawMs: drawn - initialized, rows: rows.slice(0, 32).map(row => ({ id: row.id, value: row.value })) };
      frame(() => frame(() => {
        if (nonce !== token || latest !== id || count >= 16) return;
        count++; send({ ...sample, initToFrameMs: now() - initialized, visible: visible() });
      }));
    }
  };
}
