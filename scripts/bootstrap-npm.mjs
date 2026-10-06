// Development-only fallback for hosts that provide Node without npm.
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const dir = new URL('../.dev/npm/', import.meta.url);
await mkdir(dir, { recursive: true });
const meta = await fetch('https://registry.npmjs.org/npm/11.6.2').then(r => { if (!r.ok) throw Error(r.statusText); return r.json(); });
const bytes = Buffer.from(await fetch(meta.dist.tarball).then(r => { if (!r.ok) throw Error(r.statusText); return r.arrayBuffer(); }));
const actual = 'sha512-' + createHash('sha512').update(bytes).digest('base64');
if (actual !== meta.dist.integrity) throw Error('npm integrity mismatch');
await writeFile(new URL('npm.tgz', dir), bytes);
execFileSync('tar', ['-xf', fileURLToPath(new URL('npm.tgz', dir)), '-C', fileURLToPath(dir)]);
console.log('Use: node .dev/npm/package/bin/npm-cli.js install');
