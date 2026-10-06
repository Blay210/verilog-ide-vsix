import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import type { ToolCommand, WaveformProvider } from '@rtl-dev/core';

export class GtkWaveProvider implements WaveformProvider {
  constructor(private readonly command: ToolCommand) {}
  async open(file: string): Promise<void> {
    await access(file);
    if (!/\.(vcd|fst)$/i.test(file)) throw Error('Only VCD and FST waveforms are supported.');
    await new Promise<void>((resolve, reject) => {
      const child = spawn(this.command.executable, [...this.command.args, path.resolve(file)], { cwd: path.dirname(file), env: this.command.env, shell: false, windowsHide: false, detached: true, stdio: 'ignore' });
      child.once('error', reject);
      child.once('spawn', () => { child.unref(); resolve(); });
    });
  }
}
