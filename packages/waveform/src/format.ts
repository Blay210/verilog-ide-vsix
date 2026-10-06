import type { Radix, Timescale } from './model';
const units = { s: 1000000000000000n, ms: 1000000000000n, us: 1000000000n, ns: 1000000n, ps: 1000n, fs: 1n };
export function formatTime(tick: bigint, scale: Timescale): string {
  const fs = tick * BigInt(scale.magnitude) * units[scale.unit], abs = fs < 0n ? -fs : fs;
  const unit = (Object.keys(units) as (keyof typeof units)[]).find(u => abs >= units[u]) ?? scale.unit;
  const divisor = units[unit], whole = abs / divisor, rem = abs % divisor;
  const tail = rem ? '.' + String(rem).padStart(String(divisor).length - 1, '0').replace(/0+$/, '') : '';
  return `${fs < 0n ? '-' : ''}${whole}${tail} ${unit}`;
}
/** Absolute ruler labels: split long decimals into additive whole/remainder
 * components. Never subtract the viewport origin or lose integer precision. */
export function formatRulerTime(tick: bigint, scale: Timescale): string {
  const full = formatTime(tick, scale);
  if (full.length <= 16 || !full.includes('.')) return full;
  const fs = tick * BigInt(scale.magnitude) * units[scale.unit], abs = fs < 0n ? -fs : fs;
  const unit = (Object.keys(units) as (keyof typeof units)[]).find(u => abs >= units[u]) ?? scale.unit;
  const whole = abs / units[unit], remainder = abs % units[unit];
  const detailUnit = remainder % units[scale.unit] === 0n ? scale.unit : 'fs';
  const sign = fs < 0n ? '-' : '';
  const detail = String(remainder / units[detailUnit]).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${whole} ${unit}\n${sign}${detail} ${detailUnit}`;
}
export function parseTime(text: string, scale: Timescale): bigint {
  const match = /^\s*(\d{1,40})(?:\.(\d{1,15}))?\s*(s|ms|us|ns|ps|fs)?\s*$/.exec(text);
  if (!match) throw Error('Enter a time such as 20 ns.');
  const decimals = match[2] ?? '', denominator = 10n ** BigInt(decimals.length), value = BigInt(match[1] + decimals);
  const numerator = value * units[(match[3] as keyof typeof units) ?? scale.unit];
  const divisor = denominator * units[scale.unit] * BigInt(scale.magnitude);
  if (numerator % divisor) throw Error(`Time must align with ${scale.magnitude} ${scale.unit}.`);
  return numerator / divisor;
}
export function formatValue(value: string, radix: Radix, real = false): string {
  if (radix === 'auto') radix = 'hex';
  if (real) return value;
  if (radix === 'binary' || value.length === 1) return value.toUpperCase();
  if (/[^01]/.test(value)) {
    if (radix !== 'hex') return value.toUpperCase();
    const padded = value.padStart(Math.ceil(value.length / 4) * 4, /[xz]/i.test(value[0]) ? value[0] : '0');
    return '0x' + padded.match(/.{4}/g)!.map(n => /^z+$/i.test(n) ? 'Z' : /[xz]/i.test(n) ? 'X' : parseInt(n, 2).toString(16).toUpperCase()).join('');
  }
  const number = BigInt('0b' + value);
  if (radix === 'hex') return '0x' + number.toString(16).toUpperCase().padStart(Math.ceil(value.length / 4), '0');
  return String(radix === 'signed' && value[0] === '1' ? number - (1n << BigInt(value.length)) : number);
}

/** Names are presentation only; raw worker values and cursor queries never change. */
export function formatEnumValue(value: string, radix: Radix, labels?: Record<string, string>, real = false): string {
  return radix === 'auto' && !real && /^[01]+$/.test(value) && labels && Object.hasOwn(labels, value)
    ? labels[value] : formatValue(value, radix, real);
}
