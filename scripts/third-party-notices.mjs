import { build } from 'esbuild';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Collect licenses from the dependencies actually bundled in distributable code.
const packages = new Map();
for (const entry of ['packages/vscode/src/extension.ts', 'packages/language-server/src/server.ts', 'packages/cli/src/cli.ts', 'packages/waveform/src/worker.ts']) {
  const result = await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', external: ['vscode'], write: false, metafile: true, tsconfig: 'tsconfig.json' });
  for (const input of Object.keys(result.metafile.inputs)) {
    const parts = input.replaceAll('\\', '/').split('/');
    const index = parts.lastIndexOf('node_modules');
    if (index < 0) continue;
    const root = parts.slice(0, index + (parts[index + 1].startsWith('@') ? 3 : 2)).join('/');
    const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
    packages.set(manifest.name, { root, manifest });
  }
}
let notices = 'Third-party notices for RTL Dev\nBundled dependencies; compiler and language runtimes are installed separately.\n';
for (const [name, { root, manifest }] of [...packages].sort(([a], [b]) => a.localeCompare(b))) {
  notices += `\n${'='.repeat(72)}\n${name} ${manifest.version} (${manifest.license ?? 'see license'})\n`;
  const files = (await readdir(root, { withFileTypes: true })).filter(file => file.isFile() && /^(license|licence|copying|notice)(\.|$)/i.test(file.name));
  if (!files.length) throw Error(`Missing bundled dependency license: ${name}`);
  for (const file of files) notices += `\n${file.name}\n${await readFile(path.join(root, file.name), 'utf8')}\n`;
}
await writeFile('packages/vscode/THIRD-PARTY-NOTICES.txt', notices);
console.log(`Collected licenses for ${packages.size} bundled packages`);
