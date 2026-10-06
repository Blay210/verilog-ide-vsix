import path from 'node:path';
/** Only manifest test sources qualify. Names such as tb_*.sv alone are not evidence. */
export function targetsForFile<T extends { target: { sources: string[] } }>(entries: readonly T[], resource?: { scheme: string; fsPath: string }): T[] {
  if (resource?.scheme !== 'file' || typeof resource.fsPath !== 'string') return [];
  const key = (file: string) => process.platform === 'win32' ? path.resolve(file).toLowerCase() : path.resolve(file);
  return entries.filter(entry => entry.target.sources.some(file => key(file) === key(resource.fsPath)));
}
