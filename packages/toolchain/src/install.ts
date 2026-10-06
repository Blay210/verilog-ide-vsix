import path from 'node:path';
import { createHash } from 'node:crypto';
import { mkdir, open, readFile, rm } from 'node:fs/promises';
import { checkedProcess, type OperationContext, type Toolchain } from '@rtl-dev/core';
import { detectTools, environment, exists, managedRoot, toolsHome } from './detect';
import { verifyToolchain } from './verify';

export interface InstallPlan { root: string; bootstrap: boolean; packages: string[]; missing: string[] }
export interface ToolInstallProvider {
  plan(): Promise<InstallPlan>;
  install(plan: InstallPlan, context?: OperationContext): Promise<Toolchain>;
}
export async function downloadVerified(url: string, checksumUrl: string, destination: string, context: OperationContext = {}): Promise<void> {
  const signal = context.signal ? AbortSignal.any([context.signal, AbortSignal.timeout(300000)]) : AbortSignal.timeout(300000);
  const checksumResponse = await fetch(checksumUrl, { signal });
  if (!checksumResponse.ok) throw Error(`Checksum download failed: HTTP ${checksumResponse.status}`);
  const checksum = (await checksumResponse.text()).match(/\b[a-fA-F0-9]{64}\b/)?.[0].toLowerCase();
  if (!checksum) throw Error('Official SHA256 checksum is missing.');
  const response = await fetch(url, { signal });
  if (!response.ok || !response.body) throw Error(`Download failed: HTTP ${response.status}`);
  const partial = destination + '.partial';
  const file = await open(partial, 'w');
  const hash = createHash('sha256');
  let received = 0, lastProgress = 0;
  try {
    for await (const value of response.body) {
      signal.throwIfAborted(); hash.update(value); await file.write(value); received += value.length;
      if (Date.now() - lastProgress > 1000) { context.onLog?.(`Downloaded ${(received / 1048576).toFixed(1)} MB\n`); lastProgress = Date.now(); }
    }
    if (hash.digest('hex') !== checksum) throw Error('SHA256 mismatch. Installer will not be executed.');
  } catch (error) { await file.close(); await rm(partial, { force: true }); throw error; }
  await file.close();
  const { rename } = await import('node:fs/promises');
  await rename(partial, destination);
}

export class WindowsMsys2Provider implements ToolInstallProvider {
  async plan(): Promise<InstallPlan> {
    if (process.platform !== 'win32' || process.arch !== 'x64') throw Error('Automatic installation currently supports Windows x64.');
    const root = managedRoot();
    if (!/^[A-Za-z]:[\\/][\x21-\x7e]+$/.test(root) || /[\s&|<>^%!"`]/.test(root)) throw Error('MSYS2 needs a short ASCII path without spaces. Set RTL_DEV_HOME to a user-writable folder such as D:\\rtl-dev.');
    const detected = await detectTools();
    const packages = [
      ...(!detected.toolchain ? ['mingw-w64-ucrt-x86_64-verilator', 'mingw-w64-ucrt-x86_64-gcc', 'mingw-w64-ucrt-x86_64-python', 'mingw-w64-ucrt-x86_64-lz4', 'mingw-w64-ucrt-x86_64-zlib', 'make', 'perl'] : []),
      ...(!detected.viewer ? ['mingw-w64-ucrt-x86_64-gtkwave'] : [])
    ];
    return { root, bootstrap: !(await exists(path.join(root, 'usr', 'bin', 'bash.exe'))), packages, missing: detected.missing };
  }
  // The caller must display this plan and obtain explicit user approval before calling install.
  async install(plan: InstallPlan, context: OperationContext = {}): Promise<Toolchain> {
    if (path.resolve(plan.root) !== managedRoot()) throw Error('Installation must target the managed tool directory.');
    await mkdir(toolsHome(), { recursive: true });
    const lockPath = path.join(toolsHome(), 'install.lock');
    const lock = await open(lockPath, 'wx').catch(() => { throw Error(`Another install may be running. If none is running, remove ${lockPath} and retry.`); });
    const log = await open(path.join(toolsHome(), 'install.log'), 'a');
    let writes = Promise.resolve();
    const originalLog = context.onLog;
    context = { ...context, onLog: text => { writes = writes.then(async () => { await log.write(text); }); originalLog?.(text); } };
    const packageLock = path.join(plan.root, 'var', 'lib', 'pacman', 'db.lck');
    const packageLockExisted = await exists(packageLock);
    try {
      context.onLog?.(`\nRTL installation ${new Date().toISOString()}\n`);
      context.signal?.throwIfAborted();
      if (plan.bootstrap && !(await exists(path.join(plan.root, 'usr', 'bin', 'bash.exe')))) {
        const cache = path.join(toolsHome(), 'cache', 'downloads');
        await mkdir(cache, { recursive: true });
        context.onLog?.('Resolving official MSYS2 release…\n');
        const signal = context.signal ? AbortSignal.any([context.signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000);
        const response = await fetch('https://api.github.com/repos/msys2/msys2-installer/releases?per_page=20', { signal, headers: { 'User-Agent': 'rtl-dev' } });
        if (!response.ok) throw Error(`MSYS2 release lookup failed: HTTP ${response.status}`);
        const releases = await response.json() as { tag_name: string; prerelease: boolean; assets: { name: string; browser_download_url: string }[] }[];
        const release = releases.filter(r => !r.prerelease && /^\d{4}-\d{2}-\d{2}$/.test(r.tag_name)).sort((a, b) => b.tag_name.localeCompare(a.tag_name))[0];
        const asset = release?.assets.find(a => /^msys2-base-x86_64-\d+\.sfx\.exe$/.test(a.name));
        if (!asset || !asset.browser_download_url.startsWith('https://github.com/msys2/msys2-installer/releases/download/')) throw Error('Official MSYS2 installer was not found.');
        const installer = path.join(cache, asset.name);
        await downloadVerified(asset.browser_download_url, asset.browser_download_url + '.sha256', installer, context);
        context.onLog?.('Extracting verified MSYS2 archive…\n');
        await mkdir(path.dirname(plan.root), { recursive: true });
        await checkedProcess({ executable: installer, args: ['-y', `-o${path.dirname(plan.root)}`], cwd: cache }, context);
      }
      const env = environment(plan.root);
      const shell = path.join(plan.root, 'usr', 'bin', 'bash.exe');
      // Fixed commands only; no project text is interpolated into shell scripts.
      context.onLog?.('Initializing MSYS2…\n');
      await checkedProcess({ executable: shell, args: ['--login', '-c', 'exit 0'], cwd: plan.root, env }, context);
      const pacman = path.join(plan.root, 'usr', 'bin', 'pacman.exe');
      const config = await readFile(path.join(plan.root, 'etc', 'pacman.conf'), 'utf8');
      if (/^\s*SigLevel\s*=.*\bNever\b/m.test(config)) throw Error('Package signature checking is disabled; repair pacman.conf before installing.');
      context.onLog?.('Updating signed MSYS2 packages (this can take several minutes)…\n');
      // Two passes allow a core runtime update before the remaining package update.
      await checkedProcess({ executable: pacman, args: ['-Syu', '--noconfirm'], cwd: plan.root, env }, context);
      await checkedProcess({ executable: pacman, args: ['-Syu', '--noconfirm'], cwd: plan.root, env }, context);
      if (plan.packages.length) await checkedProcess({ executable: pacman, args: ['-S', '--needed', '--noconfirm', ...plan.packages], cwd: plan.root, env }, context);
      const detected = await detectTools();
      if (!detected.toolchain) throw Error('Installation finished but no usable compiler was found. See the installation log and retry.');
      if (!detected.viewer) throw Error('GTKWave could not be verified after installation.');
      context.onLog?.('Building and running the verification test…\n');
      await verifyToolchain(detected.toolchain, context);
      return detected.toolchain;
    } catch (error) { context.onLog?.(`${String(error)}\n`); throw error; }
    finally {
      // checkedProcess does not settle cancellation until the process tree exits.
      if (context.signal?.aborted && !packageLockExisted) await rm(packageLock, { force: true });
      await writes.finally(() => log.close());
      await lock.close(); await rm(lockPath, { force: true });
    }
  }
}
