export type LexicalContext = 'code' | 'comment' | 'string' | 'directive' | 'escapedIdentifier';

/** Mask non-code while preserving UTF-16 offsets and line endings. No preprocessing. */
export function scanCode(text: string): { code: string; context: LexicalContext; lineComment: boolean; hasDirective: boolean } {
  let context: LexicalContext = 'code';
  let blockComment = false;
  let hasDirective = false;
  const masked = text.split('');
  const hide = (i: number) => { if (text[i] !== '\n' && text[i] !== '\r') masked[i] = ' '; };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (context === 'comment') {
      hide(i);
      if (blockComment && ch === '*' && next === '/') { hide(++i); context = 'code'; }
      else if (!blockComment && ch === '\n') context = 'code';
    } else if (context === 'string') {
      hide(i);
      if (ch === '\\' && next !== undefined) hide(++i);
      else if (ch === '"') context = 'code';
    } else if (context === 'directive') {
      hide(i);
      if (ch === '\n' && text[i - 1] !== '\\' && !(text[i - 1] === '\r' && text[i - 2] === '\\')) context = 'code';
    } else if (context === 'escapedIdentifier') {
      hide(i); if (/\s/.test(ch)) context = 'code';
    } else if (ch === '/' && (next === '/' || next === '*')) {
      blockComment = next === '*'; context = 'comment'; hide(i); hide(++i);
    } else if (ch === '"') { context = 'string'; hide(i); }
    else if (ch === '\\') { context = 'escapedIdentifier'; hide(i); }
    else if (ch === '`') { hasDirective = true; context = 'directive'; hide(i); }
  }
  return { code: masked.join(''), context, lineComment: context === 'comment' && !blockComment, hasDirective };
}
