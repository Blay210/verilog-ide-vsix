import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { type OperationContext, type Project, type Toolchain } from '@rtl-dev/core';
import { VerilatorBackend } from '@rtl-dev/verilator';
import { toolsHome } from './detect';

export async function verifyToolchain(tools: Toolchain, context: OperationContext = {}): Promise<void> {
  const directory = path.join(toolsHome(), 'cache', 'checks', randomUUID());
  await mkdir(directory, { recursive: true });
  const source = path.join(directory, 'smoke.sv');
  await writeFile(source, 'module smoke; initial begin #1; assert (1 == 1) else $fatal(1); $display("RTL_TOOLCHAIN_OK"); $finish; end endmodule\n');
  const target = { name: 'smoke', top: 'smoke', sources: [source], timeoutMs: 120000 };
  const project: Project = { root: directory, name: 'toolchain-check', sources: [], includeDirs: [], defines: {}, backend: 'verilator', timing: true, waveform: 'none', tests: [target] };
  const signal = context.signal ? AbortSignal.any([context.signal, AbortSignal.timeout(120000)]) : AbortSignal.timeout(120000);
  const backend = new VerilatorBackend(tools);
  await backend.check({ ...context, signal });
  const artifact = await backend.build({ project, target, directory }, { ...context, signal });
  let output = '';
  await backend.run(artifact, { signal, onLog: text => { output += text; context.onLog?.(text); } });
  if (!output.includes('RTL_TOOLCHAIN_OK')) throw Error('Toolchain smoke test did not complete.');
}
