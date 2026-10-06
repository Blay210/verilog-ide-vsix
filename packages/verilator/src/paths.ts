import path from 'node:path';
import { mkdir, mkdtemp, symlink, unlink, rmdir } from 'node:fs/promises';

// GNU make and native Verilator do not reliably accept spaces/non-ASCII paths.
// Junctions give the same files short ASCII names without copying or modifying RTL.
export async function buildPaths(root: string, cache: string | undefined) {
  const aliases = new Map<string, string>();
  let temporary: string | undefined;
  const unsafe = (value: string) => /[^A-Za-z0-9_./:\\-]/.test(value);
  async function alias(directory: string): Promise<string> {
    const absolute = path.resolve(directory);
    if (process.platform !== 'win32' || !unsafe(absolute)) return absolute;
    if (!cache || unsafe(cache)) throw Error('Windows build paths need an ASCII tool-cache location. Choose a short tools directory from RTL: Toolchain.');
    if (!temporary) { await mkdir(cache, { recursive: true }); temporary = await mkdtemp(path.join(cache, 'build-')); }
    let existing = aliases.get(absolute);
    if (!existing) { existing = path.join(temporary, String(aliases.size)); await symlink(absolute, existing, 'junction'); aliases.set(absolute, existing); }
    return existing;
  }
  const projectAlias = await alias(root);
  return {
    async map(file: string): Promise<string> {
      const relative = path.relative(root, file);
      if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
        const mapped = path.join(projectAlias, relative);
        if (!unsafe(mapped)) return mapped.replaceAll('\\', '/');
      }
      const directory = await alias(path.dirname(file));
      const mapped = path.join(directory, path.basename(file));
      if (process.platform === 'win32' && unsafe(mapped)) throw Error(`This Windows toolchain requires ASCII source file names without spaces: ${file}`);
      return mapped.replaceAll('\\', '/');
    },
    async directory(directory: string): Promise<string> { return (await alias(directory)).replaceAll('\\', '/'); },
    original(text: string): string {
      for (const [original, link] of aliases) text = text.replaceAll(link.replaceAll('\\', '/'), original.replaceAll('\\', '/')).replaceAll(link, original);
      return text;
    },
    async dispose(): Promise<void> {
      for (const link of aliases.values()) await unlink(link);
      if (temporary) await rmdir(temporary);
    }
  };
}

