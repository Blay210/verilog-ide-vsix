import { scanCode } from './lexical';

export interface BlockEdit { beforeCursor: string; afterCursor: string; replaceEnd: number }
export interface Indentation { unit: string; eol: '\n' | '\r\n' }

const boundary = /\b(?:endmodule|endfunction|endtask|endclass|endpackage|endinterface|endprogram)\b/;

function existingCloser(prefix: string, suffix: string, kind: 'begin' | 'case'): boolean {
  // Count unfinished blocks within the current enclosing declaration. This avoids
  // stealing an outer block's end when a newly typed inner begin is unclosed.
  const start = Math.max(...Array.from(prefix.matchAll(/\b(?:module|function|task|class|package|interface|program)\b/g), m => m.index), 0);
  const words = (prefix.slice(start).match(/\b(?:begin|end|case|casex|casez|endcase)\b/g) ?? []);
  const delta = (word: string) => kind === 'begin' ? (word === 'begin' ? 1 : word === 'end' ? -1 : 0) : (/^case/.test(word) ? 1 : word === 'endcase' ? -1 : 0);
  let depth = 0;
  for (const word of words) depth = Math.max(0, depth + delta(word));
  const rest = suffix.split(boundary)[0];
  // Conditional compilation cannot be resolved lexically. Do not consume an end
  // from a different branch; callers skip insertion when directives are present.
  for (const word of rest.match(/\b(?:begin|end|case|casex|casez|endcase)\b/g) ?? []) {
    depth += delta(word);
    if (depth === 0) return true;
  }
  return false;
}

export function planBlockEnter(text: string, offset: number, indentation: Indentation): BlockEdit | undefined {
  if (offset < 0 || offset > text.length) return;
  const prefix = text.slice(0, offset);
  const scanned = scanCode(prefix);
  if (scanned.context === 'string' || scanned.context === 'directive' || scanned.context === 'escapedIdentifier') return;
  // Allow a trailing // comment after an opener, but never an unfinished /* ... */.
  if (scanned.context === 'comment' && !scanned.lineComment) return;
  const code = scanned.code;
  const lineStart = prefix.lastIndexOf('\n') + 1;
  const current = code.slice(lineStart);
  let kind: 'begin' | 'case' | undefined;
  let openerStart = lineStart;
  const begin = /\bbegin(?:\s*:\s*[A-Za-z_][\w$]*)?\s*$/.exec(current);
  if (begin) { kind = 'begin'; openerStart += begin.index; }
  else {
    const tail = code.replace(/\s+(?:inside|matches)\s*$/, '').trimEnd();
    if (!tail.endsWith(')')) return;
    let depth = 0, open = -1;
    for (let i = tail.length - 1; i >= 0; i--) {
      if (tail[i] === ')') depth++;
      if (tail[i] === '(' && --depth === 0) { open = i; break; }
    }
    if (open < 0) return;
    const match = /\b(?:case|casex|casez)\s*$/.exec(tail.slice(0, open));
    if (!match) return;
    kind = 'case'; openerStart = match.index;
  }
  const whole = scanCode(text).code;
  const lineEnd = text.indexOf('\n', offset) < 0 ? text.length : text.indexOf('\n', offset);
  if (scanned.lineComment && text.slice(offset, lineEnd).trim()) return;
  const right = whole.slice(offset, lineEnd).trim();
  const close = kind === 'begin' ? 'end' : 'endcase';
  if (right && !new RegExp(`^${close}\\b`).test(right)) return;
  // A preprocessor branch changes which existing closer belongs to this block.
  const enclosingTail = text.slice(openerStart).split(boundary)[0];
  if (/^\s*`(?:ifn?def|elsif|else|endif)\b/m.test(enclosingTail)) return;
  const openerLine = text.slice(text.lastIndexOf('\n', openerStart - 1) + 1, openerStart);
  const base = /^[\t ]*/.exec(openerLine)![0];
  const beforeCursor = indentation.eol + base + indentation.unit;
  const whitespace = /^[\t ]*/.exec(text.slice(offset))![0].length;
  if (right) return { beforeCursor, afterCursor: indentation.eol + base, replaceEnd: offset + whitespace };
  const hasCloser = existingCloser(code, whole.slice(offset), kind);
  return { beforeCursor, afterCursor: hasCloser ? '' : indentation.eol + base + close, replaceEnd: offset + whitespace };
}
