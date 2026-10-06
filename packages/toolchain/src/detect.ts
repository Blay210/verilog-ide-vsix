import path from 'node:path';
import os from 'node:os';
import { access } from 'node:fs/promises';
import { checkedProcess, type ToolCommand, type Toolchain } from '@rtl-dev/core';

let configuredHome: string | undefined;
export function configureToolsHome(directory?: string): void { configuredHome = directory || undefined; }
export const toolsHome = () => path.resolve(configuredHome ?? process.env.RTL_DEV_HOME ?? path.join(os.homedir(), '.rtl-dev'));
export const managedRoot = () => path.join(toolsHome(), 'tools', 'msys64');
export async function exists(file: string): Promise<boolean> { try { await access(file); return true; } catch { return false; } }
export function environment(root: string): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const originalPath = Object.entries(env).find(([k]) => k.toLowerCase() === 'path')?.[1] ?? '';
  for (const key of Object.keys(env)) if (key.toLowerCase() === 'path') delete env[key];
  return { ...env, PATH: [path.join(root, 'ucrt64', 'bin'), path.join(root, 'usr', 'bin'), originalPath].join(path.delimiter), MSYSTEM: 'UCRT64', CHERE_INVOKING: '1', VERILATOR_ROOT: path.join(root, 'ucrt64', 'share', 'verilator').replaceAll('\\', '/') };
}
export async function findExecutable(name: string): Promise<string | undefined> {
  const directories = (Object.entries(process.env).find(([k]) => k.toLowerCase() === 'path')?.[1] ?? '').split(path.delimiter);
  for (const dir of directories) {
    if (!dir) continue;
    const file = path.join(dir.replace(/^"|"$/g, ''), process.platform === 'win32' ? name + '.exe' : name);
    if (await exists(file)) return file;
  }
}
async function usable(command: ToolCommand): Promise<boolean> {
  try { await checkedProcess({ ...command, args: [...command.args, '--version'], cwd: os.tmpdir() }, { signal: AbortSignal.timeout(10000) }); return true; } catch { return false; }
}
export interface Detection { toolchain?: Toolchain; viewer?: ToolCommand; missing: string[] }
export async function detectTools(): Promise<Detection> {
  let viewer: ToolCommand | undefined;
  const viewerPath = await findExecutable('gtkwave');
  if (viewerPath) { const candidate = { executable: viewerPath, args: [], env: { ...process.env } }; if (await usable(candidate)) viewer = candidate; }
  if (process.platform === 'win32') {
    const roots = [...new Set([process.env.RTL_MSYS2_ROOT, managedRoot(), 'C:\\msys64'].filter(Boolean) as string[])];
    const found = await findExecutable('verilator_bin');
    if (found && path.basename(path.dirname(path.dirname(found))).toLowerCase() === 'ucrt64') roots.push(path.dirname(path.dirname(path.dirname(found))));
    let toolchain: Toolchain | undefined;
    for (const root of roots) {
      const env = environment(root);
      const gtkwave = path.join(root, 'ucrt64', 'bin', 'gtkwave.exe');
      if (!viewer && await exists(gtkwave)) { const candidate = { executable: gtkwave, args: [], env }; if (await usable(candidate)) viewer = candidate; }
      // The MSYS Perl/shell wrapper can replace its Windows PID. taskkill /T
      // then loses the compiler tree and waits for its inherited pipes to close.
      // Keep the native compiler as the stable root; VERILATOR_ROOT is set above.
      const executable = path.join(root, 'ucrt64', 'bin', 'verilator_bin.exe');
      if (!toolchain && await exists(executable) && await exists(path.join(root, 'ucrt64', 'bin', 'g++.exe')) && await exists(path.join(root, 'ucrt64', 'bin', 'python3.exe')) && await exists(path.join(root, 'ucrt64', 'include', 'lz4.h')) && await exists(path.join(root, 'ucrt64', 'include', 'zlib.h')) && await exists(path.join(root, 'usr', 'bin', 'make.exe'))) {
        const compiler = { executable, args: [], env };
        if (await usable(compiler)) toolchain = { compiler, description: `MSYS2 UCRT64: ${root}`, pathAliasDirectory: path.join(toolsHome(), 'cache', 'path-aliases') };
      }
    }
    if (toolchain) toolchain.viewer = viewer;
    return { toolchain, viewer, missing: [...(!toolchain ? ['Verilator + C++ build tools (MSYS2 UCRT64)'] : []), ...(!viewer ? ['GTKWave'] : [])] };
  }
  const executable = await findExecutable('verilator');
  const compiler = executable ? { executable, args: [], env: { ...process.env } } : undefined;
  const toolchain = compiler && await usable(compiler) ? { compiler, viewer, description: executable! } : undefined;
  return { toolchain, viewer, missing: [...(!toolchain ? ['Verilator 5 + C++ build tools'] : []), ...(!viewer ? ['GTKWave'] : [])] };
}
