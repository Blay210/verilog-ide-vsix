import path from 'node:path';
import { scanCode } from '@rtl-dev/language';
import type { Analysis, InstanceInfo, ModuleInfo, Port, SourcePoint, SemanticSymbol } from './model';

const sameFile = (a: string, b: string) => process.platform === 'win32' ? path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase() : path.resolve(a) === path.resolve(b);
export function symbolCompletionContext(text: string, offset: number): { start: number; end: number; prefix: string; qualifier?: string } | undefined {
  const scan = scanCode(text.slice(0, offset));
  if (scan.context !== 'code') return;
  const qualified = /([A-Za-z_][\w$]*)\s*::\s*([\w$]*)$/.exec(scan.code);
  if (qualified) {
    const before = scan.code.slice(0, qualified.index);
    if (/[\w$]$/.test(before) || /[.:]\s*$/.test(before)) return;
    return { start: offset - qualified[2].length, end: offset + /^[\w$]*/.exec(text.slice(offset))![0].length, prefix: qualified[2], qualifier: qualified[1] };
  }
  const prefix = /[\w$]*$/.exec(scan.code)![0];
  const start = offset - prefix.length;
  if (/^[0-9$]/.test(prefix) || /[.:]$/.test(scan.code.slice(0, start).trimEnd())) return;
  return { start, end: offset + /^[\w$]*/.exec(text.slice(offset))![0].length, prefix };
}
export function instanceAt(analysis: Analysis, file: string, offset: number): InstanceInfo | undefined {
  const matches = analysis.instances.filter(i => sameFile(i.start.file, file) && offset >= i.start.offset && offset <= i.end.offset).sort((a, b) => (a.end.offset - a.start.offset) - (b.end.offset - b.start.offset));
  const first = matches[0];
  // A generated/shared source can elaborate to multiple incompatible signatures.
  // Wait for a future explicit hierarchy context instead of picking one arbitrarily.
  if (first && matches.some(i => i.start.offset === first.start.offset && JSON.stringify(i.ports) !== JSON.stringify(first.ports))) return;
  return first;
}
export function portCompletions(analysis: Analysis, file: string, text: string, offset: number): { start: number; end: number; ports: Port[] } {
  const scan = scanCode(text.slice(0, offset));
  const match = /\.\s*([A-Za-z_][\w$]*|)$/.exec(scan.code);
  const instance = instanceAt(analysis, file, offset);
  if (scan.context !== 'code' || !match || !instance) return { start: offset, end: offset, ports: [] };
  const prefix = scan.code.slice(instance.start.offset);
  let currentDepth = 0;
  for (const char of prefix) { if (char === '(') currentDepth++; if (char === ')') currentDepth--; }
  if (currentDepth !== 1) return { start: offset, end: offset, ports: [] };
  const body = scanCode(text).code.slice(instance.start.offset, instance.end.offset);
  let depth = 0;
  const used = new Set<string>();
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '(') depth++;
    if (body[i] === ')') depth--;
    if (depth === 1 && body[i] === '.') {
      const name = /^\.\s*([A-Za-z_][\w$]*)\s*(?=\(|,|\)|$)/.exec(body.slice(i));
      if (name && instance.start.offset + i !== offset - match[0].length) used.add(name[1]);
    }
  }
  return { start: offset - match[1].length, end: offset + /^[\w$]*/.exec(text.slice(offset))![0].length, ports: instance.ports.filter(p => !used.has(p.name) && p.name.startsWith(match[1])) };
}
export function symbolAt(analysis: Analysis, file: string, text: string, offset: number): { label: string; location: SourcePoint; ports?: Port[] } | undefined {
  const left = scanCode(text.slice(0, offset));
  if (left.context !== 'code') return;
  const before = /[\w$]*$/.exec(left.code)![0];
  const after = /^[\w$]*/.exec(text.slice(offset))![0];
  const word = before + after, start = offset - before.length;
  if (!word) return;
  const describePort = (p: Port) => ({ label: `${p.direction} ${p.type} ${p.name}`, location: p.location });
  const instance = instanceAt(analysis, file, offset);
  if (instance && /\.\s*$/.test(left.code.slice(0, start))) {
    const prefix = left.code.slice(instance.start.offset, start);
    let depth = 0;
    for (const char of prefix) { if (char === '(') depth++; if (char === ')') depth--; }
    const port = depth === 1 ? instance.ports.find(p => p.name === word) : undefined;
    if (port) return describePort(port);
  }
  for (const module of analysis.modules) {
    const port = module.ports.find(p => sameFile(p.location.file, file) && p.location.offset === start && p.name === word);
    if (port) return describePort(port);
  }
  const module = analysis.modules.find(m => m.name === word);
  if (module && (sameFile(module.location.file, file) && module.location.offset === start || /^(?:\s*#\s*\([\s\S]*?\))?\s+[A-Za-z_][\w$]*\s*\(/.test(scanCode(text.slice(start + word.length)).code))) return describeModule(module);
  if (instance && instance.name === word && instance.start.offset <= start) {
    const definition = analysis.modules.find(m => m.name === instance.module);
    if (definition) return { label: `${instance.module} ${instance.name}`, location: definition.location, ports: instance.ports };
  }
}
function describeModule(module: ModuleInfo) { return { label: `${module.kind} ${module.name}`, location: module.location, ports: module.ports }; }

/** Port-call guidance uses actual elaborated instance types, independently of the editor. */
export function portSignature(analysis: Analysis, file: string, text: string, offset: number): { label: string; parameters: string[]; activeParameter: number } | undefined {
  const scan = scanCode(text.slice(0, offset));
  if (scan.context !== 'code') return;
  const instance = instanceAt(analysis, file, offset);
  if (!instance || !instance.ports.length) return;
  const code = scan.code.slice(instance.start.offset);
  return signatureInList(code, `${instance.module} ${instance.name}`, instance.ports.map(p => ({ name: p.name, label: `${p.direction} ${p.type} ${p.name}` })));
}
function signatureInList(code: string, title: string, entries: {name: string; label: string}[]) {
  const open = code.indexOf('('); if (open < 0) return;
  let depth = 1, braces = 0, brackets = 0, argument = 0, start = open + 1;
  for (let i = open + 1; i < code.length; i++) {
    const ch = code[i];
    if (ch === '(') depth++;
    if (ch === ')' && --depth === 0) return;
    if (ch === '{') braces++; if (ch === '}') braces--;
    if (ch === '[') brackets++; if (ch === ']') brackets--;
    if (ch === ',' && depth === 1 && braces === 0 && brackets === 0) { argument++; start = i + 1; }
  }
  const current = code.slice(start).trimStart();
  const named = /^\.\s*([A-Za-z_][\w$]*)/.exec(current);
  if (current.startsWith('.*')) return;
  if (named) {
    argument = entries.findIndex(p => p.name === named[1]);
    if (argument < 0) return;
    // A nested function call should own its own signature help.
    if (depth > 2) return;
  } else if (current.startsWith('.') || depth > 1) return;
  if (!entries.length && !code.slice(open + 1).trim()) return { label: `${title}()`, parameters: [], activeParameter: 0 };
  if (argument >= entries.length) return;
  const parameters = entries.map(p => p.label);
  return { label: `${title}(${parameters.join(', ')})`, parameters, activeParameter: argument };
}

/** Parameter ranges come from compiler syntax, never from guessed module names. */
export function parameterSignature(analysis: Analysis, file: string, text: string, offset: number) {
  const scan = scanCode(text.slice(0, offset));
  if (scan.context !== 'code') return;
  const matches = analysis.instances.filter(i => i.parameterStart && i.parameterEnd && sameFile(i.parameterStart.file, file) && offset >= i.parameterStart.offset && offset <= i.parameterEnd.offset);
  if (!matches.length) return;
  const candidates = matches.map(instance => {
    const modules = analysis.modules.filter(m => m.name === instance.module);
    if (!modules.length || modules.some(m => JSON.stringify(m.parameters) !== JSON.stringify(modules[0].parameters))) return;
    const parameters = modules[0].parameters;
    if (!parameters?.length) return;
    return signatureInList(scan.code.slice(instance.parameterStart!.offset), `${instance.module} #`, parameters.map(p => ({ name: p.name, label: `${p.type} ${p.name} = ${p.defaultValue}` })));
  });
  const first = candidates[0];
  if (!first || candidates.some(c => JSON.stringify(c) !== JSON.stringify(first))) return;
  return first;
}

/** Locate the innermost open call; compiler lookup subsequently resolves its name. */
export function callableContext(text: string, offset: number): { name: string; qualifier?: string; start: number; code: string } | undefined {
  const scan = scanCode(text.slice(0, offset));
  if (scan.context !== 'code') return;
  const stack: number[] = [];
  for (let i = 0; i < scan.code.length; i++) {
    if (scan.code[i] === '(') stack.push(i);
    if (scan.code[i] === ')') stack.pop();
  }
  // Named argument parentheses are not calls: continue to their enclosing call.
  for (const open of stack.reverse()) {
    const before = scan.code.slice(0, open);
    const match = /(?:(?<qualifier>[A-Za-z_][\w$]*)\s*::\s*)?(?<name>[A-Za-z_][\w$]*)\s*$/.exec(before);
    if (!match?.groups) continue;
    const preceding = before.slice(0, match.index).trimEnd();
    if (/\b(?:function|task)\b[^;\n]*$/.test(preceding)) return;
    if (preceding.endsWith('.')) {
      // .arg( only at the start of an argument; object.method( is unsupported.
      if (!/[,(]\s*\.\s*$/.test(before.slice(0, match.index))) return;
      continue;
    }
    if (/[\w$:]/.test(preceding.slice(-1))) {
      if (preceding.endsWith('::') || /[\w$]$/.test(before.slice(0, match.index))) return;
    }
    if (['if', 'for', 'while', 'repeat', 'case', 'casex', 'casez'].includes(match.groups.name)) return;
    return { name: match.groups.name, qualifier: match.groups.qualifier, start: match.index, code: scan.code.slice(open) };
  }
}
export function callableSignature(symbol: SemanticSymbol, context: NonNullable<ReturnType<typeof callableContext>>) {
  if (!symbol.callable || symbol.name !== context.name) return;
  const c = symbol.callable;
  const title = `${c.kind}${c.kind === 'function' ? ' ' + c.returnType : ''} ${context.qualifier ? context.qualifier + '::' : ''}${symbol.name}`;
  return signatureInList(context.code, title, c.arguments);
}

/** Ranking applies only to a direct identifier in a named port connection. */
export function connectionPort(analysis: Analysis, file: string, text: string, offset: number): Port | undefined {
  const scan = scanCode(text.slice(0, offset));
  if (scan.context !== 'code') return;
  const instance = instanceAt(analysis, file, offset); if (!instance) return;
  const code = scan.code.slice(instance.start.offset);
  let depth = 0;
  for (const ch of code) { if (ch === '(') depth++; if (ch === ')') depth--; }
  if (depth !== 2) return;
  const match = /[,(]\s*\.\s*([A-Za-z_][\w$]*)\s*\(\s*[\w$]*$/.exec(code);
  if (!match) return;
  return instance.ports.find(p => p.name === match[1]);
}
export function connectionRank(port: Port | undefined, symbol: SemanticSymbol): { sortText: string; reason?: string } {
  const fallback = { sortText: '9_' + symbol.name };
  if (!port || symbol.kind !== 'variable') return fallback;
  const expected = port.signalType, actual = symbol.signalType;
  const known = (shape: Port['signalType']) => !!shape?.simpleIntegral && Number.isSafeInteger(shape.width) && shape.width! > 0 && typeof shape.signed === 'boolean' && typeof shape.fourState === 'boolean';
  if (!known(expected) || !known(actual)) return fallback;
  const width = expected!.width === actual!.width;
  const signed = expected!.signed === actual!.signed;
  const state = expected!.fourState === actual!.fourState;
  const rank = width ? signed && state ? 0 : 1 : 2;
  const normalize = (name: string) => name.toLowerCase().replace(/_/g, '');
  const nameRank = symbol.name === port.name ? 0 : normalize(symbol.name).includes(normalize(port.name)) ? 1 : 2;
  const reason = width ? signed && state ? 'Same width, signedness and state type' : 'Same width; signedness/state differs' : `Width differs: ${actual!.width} → ${expected!.width}`;
  return { sortText: `${rank}_${nameRank}_${symbol.name}`, reason: `${reason} · ${port.name}: ${port.direction} ${port.type}` };
}
