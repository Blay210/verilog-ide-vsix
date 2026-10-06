import path from 'node:path';
import type { InputComparison, Project, TestResult, TestTarget } from '@rtl-dev/core';

export interface Freshness { state: 'notRun' | 'checking' | 'matching' | 'changed' | 'unavailable' | 'legacy'; message?: string }
export interface FreshnessEntry { id: string; project: Project; target: TestTarget; result?: TestResult }
const key = (file: string) => process.platform === 'win32' ? path.resolve(file).toLowerCase() : path.resolve(file);
const within = (file: string, directory: string) => { const relative = path.relative(key(directory), key(file)); return !relative || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative)); };

/** Includes conservative configured include roots and retained tracked headers. */
export function affectsEntry(entry: FreshnessEntry, file: string): boolean {
  const normalized = key(file);
  return normalized === key(path.join(entry.project.root, 'rtl.toml')) ||
    [...entry.project.sources, ...entry.target.sources, ...(entry.result?.inputIdentity?.files?.map(value => value.path) ?? [])].some(input => key(input) === normalized) ||
    entry.project.includeDirs.some(directory => within(file, directory));
}

/** One sequential, cancellable background comparison batch. Older completions
 * cannot repaint a refreshed manifest, a new result, or a disposed host. */
export class InputFreshness {
  private values = new Map<string, Freshness>();
  private abort?: AbortController;
  private timer?: ReturnType<typeof setTimeout>;
  private revision = 0;
  private disposed = false;
  constructor(private compare: (result: TestResult, project: Project, signal: AbortSignal) => Promise<InputComparison>, private changed: () => void, private delayMs = 300) {}
  get(id: string): Freshness { return this.values.get(id) ?? { state: 'notRun' }; }
  refresh(entries: FreshnessEntry[], trusted: boolean): void {
    if (this.disposed) return;
    this.abort?.abort(); clearTimeout(this.timer);
    const revision = ++this.revision, abort = this.abort = new AbortController();
    this.values = new Map(entries.map(entry => [entry.id, !entry.result ? {state:'notRun'} : trusted ? {state:'checking'} : {state:'unavailable',message:'Trust this workspace to compare saved inputs.'}]));
    this.changed();
    if (!trusted || !entries.some(entry => entry.result)) return;
    this.timer = setTimeout(() => { void this.check(entries, abort, revision); }, this.delayMs);
  }
  private async check(entries: FreshnessEntry[], abort: AbortController, revision: number): Promise<void> {
    for (const entry of entries) {
      if (abort.signal.aborted || !entry.result) continue;
      let value: Freshness;
      try { value = await this.compare(entry.result, entry.project, abort.signal); }
      catch (error) { value = {state:'unavailable',message:String(error)}; }
      if (this.disposed || abort.signal.aborted || revision !== this.revision) return;
      this.values.set(entry.id, value); this.changed();
    }
  }
  dispose(): void { this.disposed = true; ++this.revision; clearTimeout(this.timer); this.abort?.abort(); this.values.clear(); }
}

export function freshnessLabel(value?: Freshness, unsaved = false): string {
  const saved = value ? {notRun:'',checking:'Checking inputs',matching:'',changed:'Outdated',unavailable:'Inputs unknown',legacy:'Inputs unknown'}[value.state] : '';
  return [saved, unsaved ? 'Unsaved edits' : ''].filter(Boolean).join(' · ');
}
