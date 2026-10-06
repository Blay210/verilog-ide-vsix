import { scanCode } from './lexical';

export interface ClosingLabelEdit { offset: number; text: string; name: string; closer: string }
const pairs: Record<string, string> = {
  module: 'endmodule', package: 'endpackage', interface: 'endinterface', program: 'endprogram',
  begin: 'end', case: 'endcase', casex: 'endcase', casez: 'endcase', randcase: 'endcase',
  function: 'endfunction', task: 'endtask', class: 'endclass', generate: 'endgenerate',
  fork: 'join', clocking: 'endclocking', property: 'endproperty', sequence: 'endsequence',
  covergroup: 'endgroup', checker: 'endchecker', primitive: 'endprimitive', table: 'endtable'
};
const declarations = new Set(['module', 'package', 'interface', 'program']);
const closers = new Set([...Object.values(pairs), 'join_any', 'join_none']);

/** Optional lexical rewrite only. Require balanced, unambiguous source; never rename labels. */
export function planClosingLabel(text: string, offset: number): ClosingLabelEdit | undefined {
  if (offset < 0 || offset > text.length || scanCode(text.slice(0, offset)).context !== 'code') return;
  const scanned = scanCode(text), code = scanned.code;
  // A macro can introduce arbitrary openers/closers. Comments and strings are harmless.
  if (scanned.hasDirective) return;
  const stack: {word: string; start: number; headerEnd: number; name?: string}[] = [];
  const candidates: ClosingLabelEdit[] = [];
  for (const token of code.matchAll(/[A-Za-z_$][\w$]*/g)) {
    const word = token[0], start = token.index!;
    if (pairs[word]) {
      let name: string | undefined, headerEnd = start + word.length;
      const suffix = code.slice(headerEnd);
      const header = word === 'begin' ? /^\s*:\s*([A-Za-z_][\w$]*)/.exec(suffix)
        : declarations.has(word) ? /^\s+(?:(?:automatic|static)\s+)?([A-Za-z_][\w$]*)\s*(?=[(#;])/.exec(suffix) : null;
      if (header && !text.slice(headerEnd, headerEnd + header[0].length).includes('\\')) {
        name = header[1]; headerEnd += header[0].length;
      }
      stack.push({ word, start, headerEnd, name });
    } else if (closers.has(word)) {
      const opener = stack.pop();
      const expected = opener && pairs[opener.word];
      if (!opener || !(expected === word || expected === 'join' && word.startsWith('join'))) return;
      const end = start + word.length;
      if (opener.name && !/^\s*:/.test(code.slice(end)) &&
          (offset >= opener.start && offset <= opener.headerEnd || offset >= start && offset <= end)) {
        candidates.push({ offset: end, text: ` : ${opener.name}`, name: opener.name, closer: word });
      }
    }
  }
  if (stack.length) return;
  return candidates[0];
}
