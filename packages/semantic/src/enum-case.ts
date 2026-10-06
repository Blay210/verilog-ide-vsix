import { scanCode } from '@rtl-dev/language';
export interface EnumCaseContext { expression: string; expressionOffset: number; close: number; base: string }
/** Initial scope: an empty ordinary case of a simple signal, with an existing closer. */
export function enumCaseContext(text: string, offset: number): EnumCaseContext | undefined {
  const scan = scanCode(text);
  const matches = [...scan.code.matchAll(/\bcase\s*\(\s*([A-Za-z_][\w$]*)\s*\)/g)].reverse();
  for (const match of matches) {
    const headerEnd = match.index! + match[0].length;
    const end = /\bendcase\b/.exec(scan.code.slice(headerEnd));
    if (!end || offset < match.index! || offset > headerEnd + end.index + 7) continue;
    const close = headerEnd + end.index;
    if (scan.code.slice(headerEnd, close).trim() || text.slice(match.index!, close).includes('`')) return;
    const lineStart = text.lastIndexOf('\n', match.index!) + 1;
    const base = /^[\t ]*/.exec(text.slice(lineStart, match.index!))![0];
    return { expression: match[1], expressionOffset: match.index! + match[0].indexOf(match[1], match[0].indexOf('(') + 1), close, base };
  }
}
export function planEnumCase(text: string, context: EnumCaseContext, values: {name: string; value: string}[], unit: string, eol: string): {offset: number; text: string} | undefined {
  if (!values.length || values.length > 256 || new Set(values.map(v=>v.value)).size !== values.length || values.some(v=>!/^([A-Za-z_][\w$]*::)?[A-Za-z_][\w$]*$/.test(v.name))) return;
  const indent = context.base + unit;
  const branches = [...values.map(v=>v.name), 'default'].map(name=>`${indent}${name}: begin${eol}${indent}${unit}${eol}${indent}end${eol}`).join('');
  const start = text.lastIndexOf('\n', context.close - 1) + 1;
  if (!text.slice(start,context.close).trim()) return {offset:start, text:branches};
  return {offset:context.close, text:eol + branches + context.base};
}
