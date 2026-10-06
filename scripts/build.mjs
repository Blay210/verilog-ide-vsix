import { build } from 'esbuild';
import { copyFile } from 'node:fs/promises';
const shared = { bundle: true, platform: 'node', target: 'node20', sourcemap: true, tsconfig: 'tsconfig.json' };
await Promise.all([
  ...['core', 'verilator', 'toolchain', 'language', 'semantic', 'waveform'].map(name => build({ ...shared, entryPoints: [`packages/${name}/src/index.ts`], outfile: `packages/${name}/dist/index.js`, format: 'cjs' })),
  ...['packages/language-server/dist/server.cjs', 'packages/vscode/dist/server.cjs'].map(outfile => build({ ...shared, entryPoints: ['packages/language-server/src/server.ts'], outfile, format: 'cjs' })),
  build({ ...shared, entryPoints: ['packages/cli/src/cli.ts'], outfile: 'packages/cli/dist/cli.cjs', format: 'cjs', banner: { js: '#!/usr/bin/env node' } }),
  build({ ...shared, entryPoints: ['packages/vscode/src/extension.ts'], outfile: 'packages/vscode/dist/extension.cjs', format: 'cjs', external: ['vscode'] })
]);
await build({ ...shared, entryPoints: ['packages/waveform/src/client.ts'], outfile: 'packages/waveform/dist/client.js', format: 'cjs' });
await build({ ...shared, entryPoints: ['packages/waveform/src/worker.ts'], outfile: 'packages/vscode/dist/waveform-worker.cjs', format: 'cjs' });
await build({ bundle: true, platform: 'browser', target: 'es2022', entryPoints: ['packages/vscode/src/webview/waveform.ts'], outfile: 'packages/vscode/dist/waveform.js', tsconfig: 'tsconfig.json' });
await copyFile('packages/vscode/src/webview/waveform.css', 'packages/vscode/dist/waveform.css');
await copyFile('packages/semantic/python/analyze.py', 'packages/vscode/dist/analyze.py');
await copyFile('packages/semantic/python/analyze.py', 'packages/cli/dist/analyze.py');
