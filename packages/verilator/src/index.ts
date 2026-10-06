import path from 'node:path';
import { mkdir, access } from 'node:fs/promises';
import { checkedProcess, type SimulatorBackend, type Toolchain, type OperationContext, type BuildRequest, type BuildArtifact } from '@rtl-dev/core';
import { buildPaths } from './paths';

export class VerilatorBackend implements SimulatorBackend {
  readonly id = 'verilator';
  readonly capabilities = { waveforms: ['vcd', 'fst', 'none'] as const, timing: true, inputSnapshot: true };
  constructor(private readonly tools: Toolchain) {}
  async check(context: OperationContext = {}): Promise<void> {
    const cmd = this.tools.compiler;
    const output = await checkedProcess({ ...cmd, args: [...cmd.args, '--version'], cwd: process.cwd() }, context);
    const match = output.match(/Verilator\s+(\d+)\.(\d+)/);
    if (!match || Number(match[1]) < 5) throw Error(`Verilator 5 or later is required: ${output}`);
  }
  async build({ project, target, directory }: BuildRequest, context: OperationContext = {}): Promise<BuildArtifact> {
    const buildDir = path.join(directory, 'build');
    await mkdir(buildDir, { recursive: true });
    const cmd = this.tools.compiler;
    const paths = await buildPaths(project.root, this.tools.pathAliasDirectory);
    try {
    const includeArgs: string[] = [];
    for (const dir of project.includeDirs) includeArgs.push(`-I${await paths.directory(dir)}`);
    const sourceArgs: string[] = [];
    for (const file of new Set([...project.sources, ...target.sources])) sourceArgs.push(await paths.map(file));
    const args = [
      ...cmd.args, '--binary', '--assert', project.timing ? '--timing' : '--no-timing',
      '--top-module', target.top, '--prefix', 'Vrtl', '--Mdir', await paths.directory(buildDir),
      ...(process.platform === 'win32' ? ['-MAKEFLAGS', `CURDIR=${await paths.directory(buildDir)}`] : []),
      '-o', 'simulation', '-j', '2', '-Wno-fatal',
      // GCC 16 / UCRT64 can emit unresolved std::string move symbols at -Os.
      // Keep this toolchain workaround in the adapter, outside project settings.
      '-CFLAGS', process.platform === 'win32' ? '-std=c++20 -O2' : '-std=c++20',
      ...(project.waveform === 'none' ? [] : [project.waveform === 'fst' ? '--trace-fst' : '--trace', '-DRTL_WAVEFORM']),
      ...(project.waveform === 'fst' ? ['-DRTL_FST'] : []),
      ...includeArgs,
      ...Object.entries(project.defines).map(([key, value]) => `-D${key}=${value}`),
      ...sourceArgs
    ];
    await checkedProcess({ ...cmd, args, cwd: await paths.directory(directory) }, { ...context, onLog: text => context.onLog?.(paths.original(text)) });
    let executable = path.join(buildDir, 'simulation');
    if (process.platform === 'win32') {
      try { await access(executable + '.exe'); executable += '.exe'; } catch { /* Some toolchains omit the suffix. */ }
    }
    await access(executable);
    return { executable, cwd: directory, env: cmd.env };
    } catch (error) { throw Error(paths.original(String(error))); }
    finally { await paths.dispose(); }
  }
  async run(artifact: BuildArtifact, context: OperationContext = {}): Promise<void> {
    await checkedProcess({ ...artifact, args: [] }, context);
  }
}
