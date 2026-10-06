import { LIMITS, type Radix, type WaveSignal } from './model';

export interface ViewSignal { path: string; radix?: Radix; color?: 'blue' | 'pink' | 'amber'; expanded?: boolean }
export interface WaveView { id: string; name: string; radix: Radix; signals: ViewSignal[] }
export interface ViewBook { version: 1; views: WaveView[]; defaultId?: string }
const radices = ['auto', 'hex', 'unsigned', 'signed', 'binary'];
const colors = ['blue', 'pink', 'amber'];
const object = (v: any) => v && typeof v === 'object' && !Array.isArray(v);
const text = (v: any, max: number) => typeof v === 'string' && v.length > 0 && v.length <= max && !/[\x00-\x1f]/.test(v);
export function parseView(value: any): WaveView {
  if (!object(value) || !text(value.id, 80) || !text(value.name, 60) || !value.name.trim() || !radices.includes(value.radix) || !Array.isArray(value.signals) || value.signals.length > LIMITS.selected) throw Error('Invalid saved waveform view.');
  const paths = new Set<string>();
  const signals = value.signals.map((s: any): ViewSignal => {
    if (!object(s) || !text(s.path, 8192) || paths.has(s.path) || (s.radix !== undefined && !radices.includes(s.radix)) || (s.color !== undefined && !colors.includes(s.color))) throw Error('Invalid saved waveform signal.');
    if (s.expanded !== undefined && typeof s.expanded !== 'boolean') throw Error('Invalid saved bus expansion.');
    paths.add(s.path); return { path: s.path, radix: s.radix, color: s.color, expanded: s.expanded || undefined };
  });
  return { id: value.id, name: value.name.trim(), radix: value.radix, signals };
}
export function parseViewBook(value: any): ViewBook {
  if (value === undefined) return { version: 1, views: [] };
  if (!object(value) || value.version !== 1 || !Array.isArray(value.views) || value.views.length > 20) throw Error('Unsupported or damaged waveform views. Saved data was not changed.');
  const views = value.views.map(parseView);
  if (new Set(views.map((v: WaveView) => v.id)).size !== views.length || new Set(views.map((v: WaveView) => v.name.toLowerCase())).size !== views.length || (value.defaultId !== undefined && !views.some((v: WaveView) => v.id === value.defaultId))) throw Error('Invalid waveform view collection.');
  return { version: 1, views, defaultId: value.defaultId };
}
export function putView(book: ViewBook, view: WaveView): ViewBook {
  const next = parseView(view), previous = book.views.find(v => v.id === next.id);
  if (!previous && book.views.length >= 20) throw Error('Up to 20 saved views per test. Replace or delete a view before adding another.');
  return parseViewBook({ ...book, views: previous ? book.views.map(v => v.id === next.id ? next : v) : [...book.views, next] });
}
export function deleteView(book: ViewBook, id: string): ViewBook {
  return parseViewBook({ ...book, defaultId: book.defaultId === id ? undefined : book.defaultId, views: book.views.filter(v => v.id !== id) });
}
export function resolveView(view: WaveView, signals: WaveSignal[]) {
  const byPath = new Map(signals.map(s => [s.path, s]));
  return { selected: view.signals.flatMap(s => byPath.has(s.path) ? [byPath.get(s.path)!.id] : []), missing: view.signals.filter(s => !byPath.has(s.path)).map(s => s.path) };
}
/** Saving an edited trace must not silently discard signals absent from this run. */
export function retainMissing(current: ViewSignal[], previous: WaveView | undefined, signals: WaveSignal[]): ViewSignal[] {
  const available = new Set(signals.map(s => s.path)), present = new Set(current.map(s => s.path));
  const result = [...current, ...(previous?.signals.filter(s => !available.has(s.path) && !present.has(s.path)) ?? [])];
  if (result.length > LIMITS.selected) throw Error('This view would exceed 32 signals including missing signals. Switch to Custom to save only available signals, or remove signals first.');
  return result;
}
