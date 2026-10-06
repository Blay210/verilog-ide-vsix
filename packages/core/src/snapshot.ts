import { mkdir, writeFile, readFile, lstat, chmod, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { captureInputs, inputSettings } from './identity';
import { prepareProject } from './project';
import { validateSnapshotIncludes } from './snapshot-includes';
import type { InputIdentity, Project, TestTarget, TestResult, PackageDependencyProvider } from './model';

const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const equal = (a: string, b: string) => process.platform === 'win32' ? path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase() : path.resolve(a) === path.resolve(b);
function relative(root: string, file: string): string {
  const value = path.relative(root, file);
  if (!value || path.isAbsolute(value) || value.split(path.sep).some(part => ['..', '.rtl', '.git', 'node_modules'].includes(part)))
    throw Error(`Snapshot source must be inside the project source tree: ${file}`);
  return value;
}

export interface RecordedInputs {
  project: Project; target: TestTarget; identity: InputIdentity; runId: string;
  sourceMappings: { original: string; recorded: string }[];
}
/** Copied package analysis failures must fail the run, never retry against originals. */
export class SnapshotPreparationError extends Error {}
/** Project-local sources/packages and literal includes through configured roots. */
export async function createInputSnapshot(project: Project, target: TestTarget, directory: string, runId: string, signal?: AbortSignal, packageProvider?: PackageDependencyProvider): Promise<RecordedInputs> {
  async function verifyOriginalPath(file: string): Promise<void> {
    const rel = equal(file, project.root) ? '' : relative(project.root, file);
    let current = project.root;
    if ((await lstat(current)).isSymbolicLink()) throw Error('Snapshot project root must not be a symlink.');
    for (const part of rel ? rel.split(path.sep) : []) {
      current = path.join(current, part);
      if ((await lstat(current)).isSymbolicLink()) throw Error('Snapshot original input paths must not contain symlinks.');
    }
  }
  for (const file of [...project.includeDirs, ...project.sources, ...target.sources]) await verifyOriginalPath(file);
  const content = new Map<string, Buffer>();
  let identity = await captureInputs(project, target, signal, (file, bytes) => {
    relative(project.root, file);
    content.set(file, bytes);
  });
  if (identity.state === 'unavailable' || !identity.fingerprint || !identity.files) throw Error(identity.reason ?? 'Input capture failed.');
  validateSnapshotIncludes(project, target, content);
  const root = path.join(directory, 'inputs');
  await mkdir(root); // Fresh run directory; never overwrite a prior snapshot.
  const mappings: { original: string; relative: string; sha256: string }[] = [];
  for (const file of identity.files) {
    signal?.throwIfAborted();
    await verifyOriginalPath(file.path);
    const rel = relative(project.root, file.path), dest = path.join(root, rel);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, content.get(file.path)!, { flag: 'wx' });
    await chmod(dest, 0o444);
    mappings.push({ original: file.path, relative: rel, sha256: file.sha256 });
  }
  const map = (file: string) => path.join(root, relative(project.root, file));
  const mapDirectory = (dir: string) => equal(dir, project.root) ? root : path.join(root, relative(project.root, dir));
  // Empty configured roots are meaningful and must survive without file mappings.
  for (const dir of project.includeDirs) await mkdir(mapDirectory(dir), { recursive: true });
  const mappedTarget = { ...target, sources: target.sources.map(map) };
  let mappedProject: Project = { ...project, root, includeDirs: project.includeDirs.map(mapDirectory), sources: project.sources.map(map),
    packageSources: project.packageSources?.map(map), tests: [mappedTarget] };
  try {
    // The authoritative graph comes from retained bytes, even if the original
    // preflight used an earlier revision or a different package order.
    mappedProject = await prepareProject(mappedProject, packageProvider, { signal });
    signal?.throwIfAborted();
  } catch (error) { throw new SnapshotPreparationError(String(error)); }
  const unmap = (file: string) => path.join(project.root, relative(root, file));
  const originalProject: Project = { ...project, sources: mappedProject.sources.map(unmap), tests: [target], packageOrder: 'manifest' };
  const settings = inputSettings(originalProject, target);
  identity = { ...identity, settings, fingerprint: sha(JSON.stringify({ settings, files: identity.files })) };
  const manifest = { version: 1, runId, project: originalProject, target, identity, mappings };
  await writeFile(path.join(directory, 'input-snapshot.json'), JSON.stringify(manifest, null, 2), { flag: 'wx' });
  return { project: mappedProject, target: mappedTarget, identity, runId,
    sourceMappings: mappings.map(file => ({ original: file.original, recorded: path.join(root, file.relative) })) };
}

const targetSchema = z.object({ name: z.string(), top: z.string(), sources: z.array(z.string()).min(1), timeoutMs: z.number().positive(), tags: z.array(z.string()).optional() }).strict();
const projectSchema = z.object({ root: z.string(), name: z.string(), sources: z.array(z.string()), includeDirs: z.array(z.string()).max(10000),
  defines: z.record(z.string()), backend: z.string(), timing: z.boolean(), waveform: z.enum(['vcd','fst','none']), tests: z.array(targetSchema).length(1),
  packageSources: z.array(z.string()).max(10000).optional(), packageOrder: z.enum(['auto','manifest']).optional(), jobs: z.number().optional() }).strict();
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const manifestSchema = z.object({ version: z.literal(1), runId: z.string().uuid(), project: projectSchema, target: targetSchema,
  identity: z.object({ version: z.literal(1), coverage: z.literal('configured-inputs'), state: z.literal('observed-stable'), fingerprint: hash,
    settings: z.string(), files: z.array(z.object({ path: z.string(), sha256: hash }).strict()) }).strict(),
  mappings: z.array(z.object({ original: z.string(), relative: z.string(), sha256: hash }).strict()).max(10000) }).strict();

/** Load a recorded compilation context only after verifying all retained bytes and paths.
 * No original source/manifest is consulted, so archived analysis survives source changes.
 */
export async function loadRecordedInputs(result: TestResult, signal?: AbortSignal): Promise<RecordedInputs> {
  if (result.inputSnapshot?.version !== 1 || result.inputSnapshot.state !== 'ready') throw Error(result.inputSnapshot?.reason ?? 'No supported recorded inputs for this result.');
  const directory = path.resolve(result.directory), record = path.join(directory, 'input-snapshot.json'), root = path.join(directory, 'inputs');
  for (const candidate of [path.dirname(path.dirname(directory)), path.dirname(directory), directory, root, record]) {
    if ((await lstat(candidate)).isSymbolicLink()) throw Error('Recorded input paths must not be symlinks.');
  }
  const info = await lstat(record);
  if (!info.isFile() || info.size > 2 * 1024 * 1024) throw Error('Invalid snapshot manifest size.');
  const manifest = manifestSchema.parse(JSON.parse(await readFile(record, 'utf8')));
  if (manifest.runId !== result.runId || manifest.target.name !== result.name || manifest.target.top !== result.top ||
      manifest.identity.fingerprint !== result.inputSnapshot.fingerprint || !equal(path.join(manifest.project.root, '.rtl', 'runs', path.basename(directory)), directory))
    throw Error('Snapshot/result context mismatch.');
  const expected = sha(JSON.stringify({ settings: manifest.identity.settings, files: manifest.identity.files }));
  if (expected !== manifest.identity.fingerprint) throw Error('Snapshot identity mismatch.');
  // Confirm the stored configuration is the configuration originally hashed.
  const observed = JSON.parse(manifest.identity.settings);
  const normalize = (file: string) => process.platform === 'win32' ? path.resolve(file).toLowerCase() : path.resolve(file);
  const settings = inputSettings(manifest.project, manifest.target);
  if (settings !== manifest.identity.settings || observed.root !== normalize(manifest.project.root)) throw Error('Snapshot settings mismatch.');
  const mappings = new Map<string,string>(), content = new Map<string,Buffer>(); let bytes = 0;
  for (const mapping of manifest.mappings) {
    signal?.throwIfAborted();
    if (mappings.has(normalize(mapping.original)) || mapping.relative !== relative(manifest.project.root, mapping.original)) throw Error('Invalid snapshot mapping.');
    const file = path.join(root, mapping.relative);
    let current = root;
    for (const part of mapping.relative.split(path.sep)) {
      current = path.join(current, part);
      if ((await lstat(current)).isSymbolicLink()) throw Error('Snapshot file paths must not be symlinks.');
    }
    const stat = await lstat(file);
    if (!stat.isFile() || stat.size > 32 * 1024 * 1024 || (bytes += stat.size) > 128 * 1024 * 1024) throw Error('Invalid snapshot input size.');
    const retained = await readFile(file); content.set(file, retained);
    if (sha(retained) !== mapping.sha256) throw Error('Recorded source content was modified.');
    if (!manifest.identity.files.some(input => equal(input.path, mapping.original) && input.sha256 === mapping.sha256)) throw Error('Snapshot file identity mismatch.');
    mappings.set(normalize(mapping.original), file);
  }
  if (mappings.size !== manifest.identity.files.length) throw Error('Incomplete snapshot.');
  const allowedFiles = new Set([...mappings.values()].map(normalize));
  let directories = 0;
  async function verifyTree(folder: string): Promise<void> {
    signal?.throwIfAborted();
    if (++directories > 10000) throw Error('Snapshot directory limit exceeded.');
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw Error('Snapshot tree must not contain symlinks.');
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) await verifyTree(file);
      else if (!entry.isFile() || !allowedFiles.has(normalize(file))) throw Error('Unrecorded snapshot file.');
    }
  }
  await verifyTree(root);
  const map = (file: string) => { const found = mappings.get(normalize(file)); if (!found) throw Error('Unrecorded input.'); return found; };
  const target: TestTarget = { ...manifest.target, sources: manifest.target.sources.map(map) };
  const includeDirs: string[] = [];
  for (const dir of manifest.project.includeDirs) {
    const rel = equal(dir, manifest.project.root) ? '' : relative(manifest.project.root, dir);
    let current = root;
    for (const part of rel ? rel.split(path.sep) : []) {
      current = path.join(current, part);
      const stat = await lstat(current);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('Invalid recorded include directory.');
    }
    includeDirs.push(current);
  }
  const project: Project = { ...manifest.project, root, includeDirs, sources: manifest.project.sources.map(map), packageSources: manifest.project.packageSources?.map(map), tests: [target], packageOrder: 'manifest' };
  validateSnapshotIncludes(project, target, content);
  return { project, target, identity: manifest.identity, runId: manifest.runId,
    sourceMappings: manifest.mappings.map(file => ({ original: file.original, recorded: path.join(root, file.relative) })) };
}
