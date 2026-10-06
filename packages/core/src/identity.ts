import { createHash } from 'node:crypto';
import { readFile, readdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import type { InputIdentity, Project, TestResult, TestTarget } from './model';

const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const key = (file: string) => process.platform === 'win32' ? path.resolve(file).toLowerCase() : path.resolve(file);
const unavailable = (reason: string): InputIdentity => ({ version: 1, coverage: 'configured-inputs', state: 'unavailable', reason });

export function inputSettings(project: Project, target: TestTarget): string {
  return JSON.stringify({ root: key(project.root), test: target.name, top: target.top,
      sources: [...new Set([...project.sources, ...target.sources].map(key))], packages: (project.packageSources ?? []).map(key), includeDirs: project.includeDirs.map(key),
      defines: Object.entries(project.defines).sort(([a], [b]) => a.localeCompare(b)),
      backend: project.backend, timing: project.timing, waveform: project.waveform,
      // Parameter overrides are currently expressed in source, not manifest settings.
    });
}

/** Conservatively tracks include-directory contents and literal include dependencies.
 * Unsupported/dynamic includes or resource limits disable comparison, never simulation.
 */
export async function captureInputs(project: Project, target: TestTarget, signal?: AbortSignal, onFile?: (file: string, content: Buffer) => void): Promise<InputIdentity> {
  try {
    const sources = [...new Set([...project.sources, ...target.sources].map(key))];
    const settings = inputSettings(project, target);
    const pending = new Set(sources), visitedDirs = new Set<string>();
    let bytes = 0;
    async function walk(directory: string): Promise<void> {
      signal?.throwIfAborted();
      const normalized = key(directory);
      if (visitedDirs.has(normalized)) return;
      visitedDirs.add(normalized);
      if (visitedDirs.size > 10000) throw Error('Input identity directory limit exceeded.');
      if ((await lstat(directory)).isSymbolicLink()) throw Error('Include directory symlinks are not tracked.');
      for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
        if (['.rtl', '.git', 'node_modules'].includes(entry.name)) continue;
        if (entry.isSymbolicLink()) throw Error('Include tree symlinks are not tracked.');
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) await walk(file);
        else if (entry.isFile()) pending.add(key(file));
        if (pending.size > 10000) throw Error('Input identity file limit exceeded.');
      }
    }
    for (const directory of project.includeDirs) await walk(directory);
    const files: { path: string; sha256: string }[] = [], done = new Set<string>();
    for (const file of pending) {
      signal?.throwIfAborted();
      if (done.has(file)) continue;
      done.add(file);
      const info = await lstat(file);
      if (!info.isFile() || info.isSymbolicLink()) throw Error(`Input is not a regular file: ${file}`);
      if (info.size > 32 * 1024 * 1024 || bytes + info.size > 128 * 1024 * 1024) throw Error('Input identity byte limit exceeded.');
      const content = await readFile(file); bytes += content.length;
      if (bytes > 128 * 1024 * 1024) throw Error('Input identity byte limit exceeded.');
      files.push({ path: file, sha256: digest(content) });
      onFile?.(file, content);
      // Conservative lexical scan: inactive branches are tracked too. Ambiguity is unavailable.
      const text = content.toString('utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g, '');
      for (const match of text.matchAll(/^\s*`include\s+([^\r\n]+)/gm)) {
        const literal = match[1].trim().match(/^"([^"\r\n]+)"\s*$/);
        if (!literal) throw Error(`Dynamic include cannot be fingerprinted: ${file}`);
        const candidates = [path.resolve(path.dirname(file), literal[1]), ...project.includeDirs.map(dir => path.resolve(dir, literal[1]))];
        let found = false;
        for (const candidate of new Set(candidates)) {
          try { await lstat(candidate); pending.add(key(candidate)); found = true; }
          catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        }
        if (!found) throw Error(`Include dependency not found: ${literal[1]}`);
        if (pending.size > 10000) throw Error('Input identity file limit exceeded.');
      }
    }
    files.sort((a,b) => a.path.localeCompare(b.path));
    const serialized = JSON.stringify({ settings, files });
    if (Buffer.byteLength(serialized) > 512 * 1024) throw Error('Input identity record limit exceeded.');
    return { version: 1, coverage: 'configured-inputs', state: 'observed-stable', settings, files,
      fingerprint: digest(serialized) };
  } catch (error) { return unavailable(String(error)); }
}

export interface InputComparison { state: 'matching' | 'changed' | 'unavailable' | 'legacy'; message: string }
/** Saved-input display comparison without running semantic analysis. In auto mode,
 * reuse only the previous package permutation: equality still requires identical
 * source membership, non-package order, settings and every tracked input byte.
 * This does not prepare a project for execution or authorize trace binding. */
export async function compareConfiguredResultInputs(result: TestResult, project: Project, signal?: AbortSignal): Promise<InputComparison> {
  let current = project;
  if (project.packageOrder === 'auto' && project.packageSources?.length && result.inputIdentity?.settings) {
    try {
      const saved: unknown = JSON.parse(result.inputIdentity.settings);
      if (!saved || typeof saved !== 'object' || !('sources' in saved) || !Array.isArray(saved.sources) || !saved.sources.every(value => typeof value === 'string'))
        return { state: 'unavailable', message: 'Recorded source ordering is unavailable.' };
      const packages = new Set(project.packageSources.map(key));
      const ordered = (saved.sources as string[]).filter(file => packages.has(key(file)));
      if (ordered.length === packages.size && new Set(ordered.map(key)).size === packages.size) {
        const originals = new Map(project.packageSources.map(file => [key(file), file]));
        current = { ...project, sources: [...ordered.map(file => originals.get(key(file))!), ...project.sources.filter(file => !packages.has(key(file)))] };
      }
    } catch { return { state: 'unavailable', message: 'Recorded source ordering is invalid.' }; }
  }
  return compareResultInputs(result, current, signal);
}
/** Matching only means sampled saved inputs match; never authorizes trace/diagram binding. */
export async function compareResultInputs(result: TestResult, project: Project, signal?: AbortSignal): Promise<InputComparison> {
  const saved = result.inputIdentity;
  if (!saved) return { state: 'legacy', message: 'This older result has no input identity. Logs and waveforms remain available.' };
  if (saved.version !== 1 || saved.state === 'unavailable' || !saved.fingerprint)
    return { state: 'unavailable', message: saved.reason ?? 'Input identity is unavailable or unsupported.' };
  if (saved.state === 'changed-during-run') return { state: 'changed', message: 'Inputs changed during this run; its source identity is uncertain.' };
  if (result.inputSnapshot?.state === 'ready') {
    try { await (await import('./snapshot')).loadRecordedInputs(result, signal); }
    catch (error) { return { state: 'unavailable', message: `Recorded inputs cannot be verified: ${String(error)}` }; }
  }
  const target = project.tests.find(test => test.name === result.name);
  if (!target) return { state: 'changed', message: 'This test is no longer defined in the current project.' };
  const current = await captureInputs(project, target, signal);
  if (current.state === 'unavailable') return { state: 'unavailable', message: current.reason! };
  return current.fingerprint === saved.fingerprint
    ? { state: 'matching', message: result.inputSnapshot?.state === 'ready'
      ? 'Saved inputs match the retained sources used for this build. Unsaved editor changes and tool environment are separate.'
      : 'Saved inputs match the observations before and after this run. Unsaved edits and atomic build snapshots are not covered.' }
    : { state: 'changed', message: 'Current saved sources or simulation settings differ from this run. Its waveform belongs to the recorded run.' };
}
