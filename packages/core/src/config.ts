import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'smol-toml';
import glob from 'fast-glob';
import { z } from 'zod';
import type { Project } from './model';

const identifier = z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_$]*$/);
const paths = z.array(z.string().min(1));
const schema = z.object({
  version: z.literal(1),
  project: z.object({ name: z.string().min(1) }).strict(),
  sources: z.object({ packages: paths.default([]), package_order: z.enum(['auto', 'manifest']).default('auto'), rtl: paths.default(['rtl/**/*.{sv,v}']), include_dirs: paths.default([]), defines: z.record(z.union([z.string(), z.number(), z.boolean()])).default({}) }).strict().default({}),
  simulation: z.object({ backend: z.string().min(1).default('verilator'), timing: z.boolean().default(true), waveform: z.enum(['vcd', 'fst', 'none']).default('vcd'), timeout_ms: z.number().int().positive().max(86400000).default(60000), jobs: z.number().int().min(1).max(4).default(1) }).strict().default({}),
  test: z.array(z.object({ name: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/), top: identifier, sources: paths.min(1), tags: z.array(z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/)).default([]), timeout_ms: z.number().int().positive().max(86400000).optional() }).strict()).default([])
}).strict();

export async function discover(root: string, patterns: string[]): Promise<string[]> {
  const files: string[] = [];
  for (const original of patterns) {
    const pattern = original.replaceAll('\\', '/');
    if (pattern.startsWith('!')) throw Error('Negative source globs are not supported; use explicit source groups.');
    const found = await glob(pattern, { cwd: root, absolute: true, onlyFiles: true, unique: true, followSymbolicLinks: false, ignore: ['**/.rtl/**', '**/node_modules/**', '**/.git/**'] });
    if (!found.length) throw Error(`Source pattern matched no files: ${original}`);
    files.push(...found.sort().map(file => path.resolve(file)));
  }
  const seen = new Set<string>();
  return files.filter(file => { const key = process.platform === 'win32' ? file.toLowerCase() : file; if (seen.has(key)) return false; seen.add(key); return true; });
}

export async function loadProject(directory: string): Promise<Project> {
  const root = path.resolve(directory);
  let raw: unknown;
  try { raw = parse(await readFile(path.join(root, 'rtl.toml'), 'utf8')); }
  catch (error) { throw Error(`Cannot read rtl.toml: ${String(error)}`); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw Error(parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n'));
  const config = parsed.data;
  const names = new Set<string>();
  for (const target of config.test) {
    if (names.has(target.name.toLowerCase())) throw Error(`Duplicate test name: ${target.name}`);
    names.add(target.name.toLowerCase());
  }
  for (const key of Object.keys(config.sources.defines)) if (!/^[A-Za-z_][A-Za-z0-9_$]*$/.test(key)) throw Error(`Invalid define: ${key}`);
  for (const key of ['RTL_WAVEFORM', 'RTL_FST']) if (key in config.sources.defines) throw Error(`${key} is reserved; set simulation.waveform instead.`);
  const includeDirs = config.sources.include_dirs.map(p => path.resolve(root, p));
  for (const dir of includeDirs) if (!(await stat(dir)).isDirectory()) throw Error(`Include path is not a directory: ${dir}`);
  return {
    root, name: config.project.name,
    packageSources: await discover(root, config.sources.packages), packageOrder: config.sources.package_order, jobs: config.simulation.jobs,
    sources: await discover(root, [...config.sources.packages, ...config.sources.rtl]),
    includeDirs, defines: Object.fromEntries(Object.entries(config.sources.defines).map(([k, v]) => [k, String(v)])),
    backend: config.simulation.backend, timing: config.simulation.timing, waveform: config.simulation.waveform,
    tests: await Promise.all(config.test.map(async t => ({ name: t.name, top: t.top, tags: [...new Set(t.tags)], sources: await discover(root, t.sources), timeoutMs: t.timeout_ms ?? config.simulation.timeout_ms })))
  };
}
