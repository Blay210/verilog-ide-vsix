import path from 'node:path';
import { readdir, readFile, lstat } from 'node:fs/promises';
import { z } from 'zod';
import type { TestResult, InputIdentity } from './model';
import { parseTraceIdentity } from './trace';
const identitySchema = z.object({ version: z.literal(1), coverage: z.literal('configured-inputs'),
  state: z.enum(['observed-stable', 'changed-during-run', 'unavailable']),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  files: z.array(z.object({ path: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/) })).optional(),
  settings: z.string().optional(), reason: z.string().optional() });
const identity = z.unknown().transform((value): InputIdentity | undefined => {
  if (value === undefined) return undefined;
  const parsed = identitySchema.safeParse(value);
  return parsed.success ? parsed.data : { version: 1, coverage: 'configured-inputs', state: 'unavailable', reason: 'Unsupported or damaged input identity.' };
});
const snapshot = z.unknown().transform((value): TestResult['inputSnapshot'] => {
  if (value === undefined) return undefined;
  const parsed = z.object({ version: z.literal(1), state: z.enum(['ready','unavailable']), fingerprint: z.string().regex(/^[a-f0-9]{64}$/).optional(), reason: z.string().optional() }).safeParse(value);
  return parsed.success ? parsed.data : { version: 1, state: 'unavailable', reason: 'Unsupported or damaged recorded input metadata.' };
});
const schema = z.object({ name: z.string(), top: z.string(), status: z.enum(['passed', 'failed', 'cancelled', 'timedOut']), durationMs: z.number().nonnegative(), directory: z.string(), log: z.string(), source: z.string().optional(), waveform: z.string().optional(), message: z.string().optional(), startedAt: z.string().datetime().optional(), tags: z.array(z.string()).optional(), sources: z.array(z.string()).optional(), runId: z.string().uuid().optional(), inputIdentity: identity, inputSnapshot: snapshot, traceIdentity: z.unknown().transform(parseTraceIdentity) });
/** Read complete, validated records only. Old records use result.json's mtime. */
export async function readHistory(root: string, limit = 100): Promise<TestResult[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw Error('History limit must be 1..1000.');
  const base = path.join(path.resolve(root), '.rtl'), runs = path.join(base, 'runs');
  try { for (const dir of [base, runs]) if ((await lstat(dir)).isSymbolicLink()) throw Error('History directories must not be symlinks.'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
  const rows: TestResult[] = [];
  for (const entry of await readdir(runs, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    const directory = path.join(runs, entry.name), record = path.join(directory, 'result.json');
    try {
      const info = await lstat(record);
      if (!info.isFile() || info.isSymbolicLink() || info.size > 1048576) continue;
      const value = schema.parse(JSON.parse(await readFile(record, 'utf8')));
      const equal = (a: string, b: string) => process.platform === 'win32' ? path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase() : path.resolve(a) === path.resolve(b);
      if (!equal(value.directory, directory)) continue;
      for (const file of [value.log, value.waveform].filter((f): f is string => !!f)) {
        const artifact = await lstat(file);
        if (!equal(path.dirname(file), directory) || !artifact.isFile() || artifact.isSymbolicLink()) throw Error('Unsafe artifact');
      }
      rows.push({ ...value, startedAt: value.startedAt ?? info.mtime.toISOString() });
    } catch { /* Interrupted, damaged, or removed run: keep other history readable. */ }
  }
  return rows.sort((a, b) => b.startedAt!.localeCompare(a.startedAt!) || a.directory.localeCompare(b.directory)).slice(0, limit);
}
