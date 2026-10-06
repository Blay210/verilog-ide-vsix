import path from 'node:path';
import { open, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loadProject } from '@rtl-dev/core';

export interface WaveTestContext { key: string; label: string }
const equal = (a: string, b: string) => process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
export function waveViewKey(root: string, name: string, top: string): string {
  const canonical = process.platform === 'win32' ? path.resolve(root).toLowerCase() : path.resolve(root);
  return 'waveViews.v1.' + createHash('sha256').update(JSON.stringify([canonical, name, top])).digest('hex');
}
/** Infer only from a validated run of an open project; the page cannot supply a storage key. */
export async function findWaveTest(file: string, roots: string[]): Promise<WaveTestContext | undefined> {
  for (const root of roots) {
    try {
      const actualRoot = await realpath(root), actualFile = await realpath(file);
      const relative = path.relative(actualRoot, actualFile).split(path.sep);
      if (relative.length !== 4 || relative[0] !== '.rtl' || relative[1] !== 'runs') continue;
      const directory = path.dirname(actualFile), record = path.join(directory, 'result.json');
      if (!equal(path.dirname(await realpath(record)), directory)) continue;
      const handle = await open(record, 'r'); let content: string;
      try {
        const stat = await handle.stat(); if (!stat.isFile() || stat.size > 1048576) continue;
        const buffer = Buffer.alloc(stat.size + 1); let offset = 0;
        while (offset < buffer.length) { const r = await handle.read(buffer, offset, buffer.length - offset, offset); if (!r.bytesRead) break; offset += r.bytesRead; }
        if (offset !== stat.size) continue;
        content = buffer.subarray(0, offset).toString('utf8');
      } finally { await handle.close(); }
      const result = JSON.parse(content);
      if (typeof result.name !== 'string' || typeof result.top !== 'string' || typeof result.waveform !== 'string' || typeof result.directory !== 'string') continue;
      if (!equal(await realpath(result.waveform), actualFile) || !equal(await realpath(result.directory), directory)) continue;
      const project = await loadProject(root);
      if (!project.tests.some(t => t.name === result.name && t.top === result.top)) continue;
      return { key: waveViewKey(actualRoot, result.name, result.top), label: `${project.name} / ${result.name}` };
    } catch { /* Standalone traces keep ordinary per-editor state without test-specific presets. */ }
  }
}
