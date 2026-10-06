import type { WindowRequest, WaveWindow, WaveValues } from '@rtl-dev/waveform';
/** One renderer-local viewport, never saved or shared between reader generations. */
export class WindowReuse {
  private entry?: { key: string; window: WaveWindow };
  private key(r: WindowRequest) { return JSON.stringify([r.signals, r.from, r.to, r.pixels]); }
  clear() { this.entry = undefined; }
  matches(r: WindowRequest) { return this.entry?.key === this.key(r); }
  remember(r: WindowRequest, window: WaveWindow) {
    if (window.from !== r.from || window.to !== r.to || window.cursor !== r.cursor || window.rows.length !== r.signals.length
      || window.rows.some((row, i) => row.id !== r.signals[i])) { this.clear(); return; }
    this.entry = { key: this.key(r), window };
  }
  merge(r: WindowRequest, values: WaveValues): WaveWindow | undefined {
    if (!this.matches(r) || values.cursor !== r.cursor || values.rows.length !== r.signals.length
      || values.rows.some((row, i) => row.id !== r.signals[i])) return undefined;
    return { ...this.entry!.window, cursor: values.cursor,
      rows: this.entry!.window.rows.map((row, i) => ({ ...row, value: values.rows[i].value })) };
  }
}
