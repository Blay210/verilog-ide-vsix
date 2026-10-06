import { LIMITS, type Change, type Timescale, type WaveData, type WaveSignal } from './model';

/** Bounded VCD reader. Run off the UI thread; errors never produce partial traces. */
export function parseVcd(text: string): WaveData {
  if (text.length > LIMITS.bytes) throw Error('VCD exceeds the built-in reader size limit.');
  const tokens = text.matchAll(/\S+/g);
  const next = () => { const value = tokens.next(); if (value.done) throw Error('Unexpected end of VCD.'); return value.value[0]; };
  const body = () => { const list: string[] = []; for (let token = next(); token !== '$end'; token = next()) list.push(token); return list; };
  const signals: WaveSignal[] = [], channels = new Map<string, Change[]>(), widths = new Map<string, { width: number; real: boolean }>();
  const scope: string[] = [], warnings: string[] = [];
  // Local short-value reuse: bounded metadata, no reader/global cache. Stop
  // looking up once saturated so high-uniqueness traces pay only startup cost.
  let valuePool: Map<string, string> | undefined = new Map(), pooledCharacters = 0;
  let timescale: Timescale | undefined, definitions = false, tick = 0n, timestamp = '0', changes = 0, storedCharacters = 0, namesSize = 0, inDump = false;
  const put = (code: string, value: string, real = false) => {
    const info = widths.get(code); if (!info) throw Error(`Value uses undeclared VCD identifier: ${code}`);
    if (real !== info.real) throw Error(`Value encoding disagrees with declaration: ${code}`);
    if (real) { if (value.length > 64 || !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(value) || !Number.isFinite(Number(value))) throw Error('Invalid real VCD value.'); }
    else {
      value = value.toLowerCase();
      if (!/^[01xz]+$/.test(value) || value.length > info.width) throw Error(`Invalid ${info.width}-bit VCD value.`);
      value = value.padStart(info.width, /[xz]/.test(value[0]) ? value[0] : '0');
      // Reuse normalized short values only, after all validation and padding.
      if (valuePool && value.length <= 64) {
        const existing = valuePool.get(value);
        if (existing !== undefined) value = existing;
        else if (valuePool.size >= 4096 || pooledCharacters + value.length > 65536) valuePool = undefined;
        else { valuePool.set(value, value); pooledCharacters += value.length; }
      }
      // End short-value reuse.
    }
    const list = channels.get(code)!, last = list.at(-1);
    if (last?.time === timestamp) {
      storedCharacters += value.length - last.value.length; last.value = value;
      if (list.length > 1 && list[list.length - 2].value === value) { list.pop(); changes--; storedCharacters -= value.length; }
    }
    else if (last?.value !== value) {
      if (++changes > LIMITS.changes) throw Error('Waveform exceeds 1,000,000 changes. Use GTKWave for this file.');
      storedCharacters += value.length;
      if (storedCharacters > 64 * 1024 * 1024) throw Error('Decoded waveform exceeds 64 MiB. Use GTKWave.');
      // All changes at a tick share one canonical decimal string. Converting a
      // BigInt per signal needlessly duplicates timestamps in large traces.
      list.push({ time: timestamp, value });
    }
    if (storedCharacters > 64 * 1024 * 1024) throw Error('Decoded waveform exceeds 64 MiB. Use GTKWave.');
  };
  for (let result = tokens.next(); !result.done; result = tokens.next()) {
    const token = result.value[0];
    if (!definitions) {
      if (['$date', '$version', '$comment'].includes(token)) { body(); continue; }
      if (token === '$timescale') {
        const match = /^(1|10|100)(s|ms|us|ns|ps|fs)$/.exec(body().join(''));
        if (!match || timescale) throw Error('Invalid or duplicate VCD timescale.');
        timescale = { magnitude: Number(match[1]), unit: match[2] as Timescale['unit'] };
      } else if (token === '$scope') {
        const entry = body(); if (entry.length !== 2 || scope.length >= 128) throw Error('Invalid or excessively nested VCD scope.'); scope.push(entry[1]);
      } else if (token === '$upscope') {
        if (body().length || !scope.length) throw Error('Unbalanced VCD scope.'); scope.pop();
      } else if (token === '$var') {
        const type = next(), size = next(), code = next(), referenceName = next(), name = [referenceName, ...body()], width = Number(size);
        if (referenceName === '$end') throw Error('Missing VCD reference name.');
        if (!code || !name.length || !/^\d+$/.test(size) || !Number.isInteger(width) || width < 1 || width > LIMITS.width) throw Error('Invalid or unsupported VCD variable width.');
        if (!['wire', 'reg', 'integer', 'parameter', 'real', 'realtime', 'time', 'supply0', 'supply1', 'tri', 'tri0', 'tri1', 'triand', 'trior', 'trireg', 'wand', 'wor', 'logic', 'bit'].includes(type)) throw Error(`Unsupported VCD type: ${type}. Use GTKWave.`);
        if (signals.length >= LIMITS.signals) throw Error('Waveform exceeds 10,000 signal declarations. Use GTKWave.');
        const real = type === 'real' || type === 'realtime', previous = widths.get(code);
        if (previous && (previous.width !== width || previous.real !== real)) throw Error('Incompatible VCD aliases.');
        if (!previous) { widths.set(code, { width, real }); channels.set(code, []); }
        const reference = name.join(' '), parent = scope.join('.');
        namesSize += reference.length + parent.length;
        if (reference.length > 1024 || parent.length > 4096 || namesSize > 2 * 1024 * 1024) throw Error('VCD signal names exceed the viewer limit.');
        signals.push({ id: String(signals.length), code, name: reference, scope: parent, path: [...scope, reference].join('.'), width, type, scopeSegments: [...scope], reference: referenceName, range: name.slice(1).join(' ') || undefined });
      } else if (token === '$enddefinitions') {
        if (body().length || scope.length) throw Error('Unclosed VCD definitions.'); definitions = true;
      } else throw Error(`Unsupported VCD header token: ${token}`);
      continue;
    }
    if (token === '$comment') { body(); continue; }
    if (['$dumpvars', '$dumpall', '$dumpon', '$dumpoff'].includes(token)) { if (inDump) throw Error('Nested VCD dump command.'); inDump = true; continue; }
    if (token === '$end') { if (!inDump) throw Error('Unexpected VCD end command.'); inDump = false; continue; }
    if (token[0] === '#') {
      if (!/^\d{1,40}$/.test(token.slice(1))) throw Error('Invalid VCD timestamp.');
      const current = BigInt(token.slice(1)); if (current < tick) throw Error('VCD timestamps are not monotonic.'); tick = current; timestamp = String(tick);
    } else if (/^[01xzXZ]/.test(token)) put(token.slice(1), token[0]);
    else if (/^[bB]/.test(token)) put(next(), token.slice(1));
    else if (/^[rR]/.test(token)) put(next(), token.slice(1), true);
    else throw Error(`Unsupported VCD value token: ${token.slice(0, 80)}. Use GTKWave for extended formats.`);
  }
  if (inDump) throw Error('Incomplete VCD dump command.');
  if (!definitions || !signals.length) throw Error('No complete VCD signal definitions found.');
  if (!timescale) { timescale = { magnitude: 1, unit: 'ns' }; warnings.push('No timescale in file; displaying 1 ns per tick.'); }
  return { signals, channels, timescale, end: String(tick), changes, warnings };
}
