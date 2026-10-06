import path from 'node:path';
import { mkdir, mkdtemp, open, rename, rm } from 'node:fs/promises';
import { checkedProcess, type OperationContext } from '@rtl-dev/core';
import { toolsHome, exists } from './detect';
import { downloadVerified } from './install';

// SHA256 values published by python.org (3.14.7 release page) and PyPI (11.0.0 JSON).
const pythonUrl = 'https://www.python.org/ftp/python/3.14.7/python-3.14.7-embed-amd64.zip';
const pythonHash = 'd297e5ff019966817ad8502465176139f2d3d840fa4ed84b13bed399a6ab1f15';
const wheelUrl = 'https://files.pythonhosted.org/packages/f5/6c/7488aa57816f2a92ee8acf691d0a4563b99d4ea96285f6fe0a7a0f2873b0/pyslang-11.0.0-cp314-cp314-win_amd64.whl';
const wheelHash = 'c67a10162bc9381b8223de8ac7aa3d58d3f98f720bb36e8b44db1a9d906245bc';
export const semanticRoot = () => path.join(toolsHome(), 'tools', 'slang-11.0.0-python-3.14.7');
export const semanticPython = () => path.join(semanticRoot(), 'python.exe');
export async function verifySemanticRuntime(python = semanticPython(), context: OperationContext = {}): Promise<void> {
  const code = "import pyslang as s; assert s.__version__ == '11.0.0'; c=s.ast.Compilation(); c.addSyntaxTree(s.syntax.SyntaxTree.fromText('module probe(input logic a); endmodule\\n')); assert c.getRoot().topInstances[0].body.portList[0].name == 'a'; print('slang 11.0.0 ready')";
  await checkedProcess({ executable: python, args: ['-I', '-B', '-c', code], cwd: path.dirname(python) }, { ...context, signal: context.signal ? AbortSignal.any([context.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
}
export async function detectSemanticRuntime(context: OperationContext = {}): Promise<string | undefined> {
  if (!await exists(semanticPython())) return;
  await verifySemanticRuntime(semanticPython(), context);
  return semanticPython();
}
/** Caller shows the destination and obtains approval before installation. */
export async function installSemanticRuntime(context: OperationContext = {}): Promise<string> {
  if (process.platform !== 'win32' || process.arch !== 'x64') throw Error('Semantic runtime installation supports Windows x64.');
  const parent = path.dirname(semanticRoot());
  await mkdir(parent, { recursive: true });
  const lockPath = path.join(parent, 'slang-install.lock');
  const lock = await open(lockPath, 'wx').catch(() => { throw Error('Another slang installation is running. Retry after it completes.'); });
  let staging: string | undefined;
  try {
    const current = await detectSemanticRuntime();
    if (current) return current;
    staging = await mkdtemp(path.join(parent, 'slang-install-'));
    const runtime = path.join(staging, 'runtime');
    await mkdir(runtime);
    context.onLog?.('Downloading Python 3.14.7 and slang 11.0.0; verifying published SHA256 values.\n');
    const archive = path.join(staging, 'python.zip'), wheel = path.join(staging, 'pyslang.whl');
    await downloadVerified(pythonUrl, `data:text/plain,${pythonHash}`, archive, context);
    await downloadVerified(wheelUrl, `data:text/plain,${wheelHash}`, wheel, context);
    await checkedProcess({ executable: 'tar.exe', args: ['-xf', archive, '-C', runtime], cwd: staging }, context);
    const python = path.join(runtime, 'python.exe');
    await checkedProcess({ executable: python, args: ['-I', '-B', '-m', 'zipfile', '-e', wheel, runtime], cwd: staging }, context);
    await verifySemanticRuntime(python, context);
    await rename(runtime, semanticRoot());
    context.onLog?.('slang semantic analysis verified.\n');
    return semanticPython();
  } finally {
    if (staging) await rm(staging, { recursive: true, force: true });
    await lock.close(); await rm(lockPath, { force: true });
  }
}
