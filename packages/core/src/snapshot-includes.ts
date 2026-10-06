import path from 'node:path';
import type { Project, TestTarget } from './model';
const key = (file: string) => process.platform === 'win32' ? path.resolve(file).toLowerCase() : path.resolve(file);

/** A deliberately restricted lexical include contract, not preprocessing.
 * Ignore comments / ordinary strings; reject inline, macro-generated and dynamic
 * directives rather than inventing compiler resolution. Inactive branches count.
 */
function literals(source: string): string[] {
  let text = '', quote = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quote) { text += c; if (c === '\\') text += source[++i] ?? ''; else if (c === '"') quote = false; }
    else if (c === '"') { quote = true; text += c; }
    else if (c === '/' && source[i+1] === '/') {
      text += '  '; i++;
      while (i+1 < source.length && source[i+1] !== '\n') { i++; text += ' '; }
    } else if (c === '/' && source[i+1] === '*') {
      text += '  '; i++;
      while (i+1 < source.length) {
        i++; if (source[i] === '*' && source[i+1] === '/') { text += '  '; i++; break; }
        text += source[i] === '\n' ? '\n' : ' ';
      }
    } else text += c;
  }
  const result: string[] = []; quote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === '\\') i++; else if (c === '"') quote = false; continue; }
    if (c === '"') { quote = true; continue; }
    if (c !== '`' || !text.startsWith('`include', i) || /[A-Za-z0-9_]/.test(text[i+8] ?? '')) continue;
    const lineStart = text.lastIndexOf('\n', i-1) + 1;
    const lineEnd = text.indexOf('\n', i), end = lineEnd < 0 ? text.length : lineEnd;
    if (/\\[ \t\r]*\n?$/.test(text.slice(text.lastIndexOf('\n', lineStart-2)+1, lineStart)))
      throw Error('Snapshot includes inside continued macro definitions are unsupported.');
    const match = text.slice(i, end).match(/^`include[ \t]+"([^"\r\n]+)"[ \t\r]*$/);
    if (!/^[ \t\r]*$/.test(text.slice(lineStart, i)) || !match)
      throw Error('Snapshots require standalone literal include directives; dynamic or generated includes are unsupported.');
    const name = match[1];
    if (path.isAbsolute(name) || /[\\:`$~]/.test(name) || name.split('/').some(part => ['..','.rtl','.git','node_modules'].includes(part)))
      throw Error(`Snapshot include must be a project-local relative path without traversal: ${name}`);
    result.push(name); i = end - 1;
  }
  return result;
}

/** Both adapters must select the first configured root. Source-relative-only and
 * source/root-local shadowing are withheld because Verilator and slang differ.
 * Contents contain all configured trees and the conservatively observed headers.
 */
export function validateSnapshotIncludes(project: Project, target: TestTarget, contents: Map<string, Buffer>): void {
  const files = new Map([...contents].map(([file, bytes]) => [key(file), bytes]));
  const pending = new Set([...project.sources, ...target.sources].map(key));
  for (const file of pending) {
    const bytes = files.get(file); if (!bytes) throw Error(`Unrecorded include input: ${file}`);
    for (const name of literals(bytes.toString('utf8'))) {
      const selected = project.includeDirs.map(dir => key(path.resolve(dir, name))).find(candidate => files.has(candidate));
      if (!selected) throw Error(`Snapshot include must resolve through sources.include_dirs: ${name}`);
      for (const local of [key(path.resolve(path.dirname(file), name)), key(path.resolve(project.root, name))]) {
        if (files.has(local) && local !== selected) throw Error(`Snapshot include has conflicting local shadow: ${name}`);
      }
      pending.add(selected);
    }
    if (pending.size > 10000) throw Error('Snapshot include dependency limit exceeded.');
  }
}
