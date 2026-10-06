import { build } from 'esbuild';
import { mkdir, mkdtemp, readFile, cp } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { prepareEditorProfile } from './editor-profile.mjs';
import './build.mjs';
const require = createRequire(import.meta.url);
const { createProject } = require('../packages/core/dist/index.js');
const code = process.env.VSCODE_EXECUTABLE;
if (!code) throw Error('Set VSCODE_EXECUTABLE to the full path to Code.exe. Uses isolated test profiles only.');
await mkdir('.dev/vscode-tests', { recursive: true });
const resume = process.env.RTL_MANUAL_RESUME_ROOT;
if (resume && (process.env.RTL_MANUAL_ACCEPTANCE !== '1' || !/^run-[^\\/]+$/.test(path.relative(path.resolve('.dev/vscode-tests'), path.resolve(resume))))) throw Error('Manual resume requires an existing isolated .dev/vscode-tests/run-* root.');
const runRoot = resume ? path.resolve(resume) : await mkdtemp(path.resolve('.dev/vscode-tests/run-'));
const project = path.join(runRoot, 'project');
const editorProfile = process.env.RTL_EDITOR_PROFILE_TEST === '1';
if (process.env.RTL_EDITOR_PROFILE_PHYSICAL === '1' && !editorProfile) throw Error('Physical editing input requires RTL_EDITOR_PROFILE_TEST=1.');
if (editorProfile) await prepareEditorProfile(runRoot);
if (resume) await readFile(path.join(project, 'rtl.toml'), 'utf8');
else if (process.env.RTL_RECORDED_PACKAGE_TEST === '1' || process.env.RTL_RECORDED_INCLUDE_TEST === '1') {
  if (process.env.RTL_RECORDED_TEST !== '1') throw Error('Package fixture requires RTL_RECORDED_TEST=1.');
  await cp(process.env.RTL_RECORDED_INCLUDE_TEST === '1' ? 'examples/include-counter' : 'examples/package-counter', project, { recursive: true, filter: source => !source.split(path.sep).includes('.rtl') });
} else await createProject(project, true);
await build({ bundle: true, platform: 'node', target: 'node20', entryPoints: ['tests/vscode/suite.ts'], outfile: '.dev/vscode-tests/suite.cjs', format: 'cjs', external: ['vscode'] });
const persistent = process.env.RTL_MANUAL_PERSISTENT === '1';
if (persistent && process.env.RTL_MANUAL_ACCEPTANCE !== '1') throw Error('Persistent development windows require manual acceptance mode.');
const args = [project, '--new-window', ...(!editorProfile ? ['--disable-extensions'] : []), '--disable-workspace-trust', '--skip-welcome', '--skip-release-notes', '--user-data-dir', path.join(runRoot, 'profile'), '--extensions-dir', path.join(runRoot, 'extensions'), '--extensionDevelopmentPath=' + path.resolve('packages/vscode')];
if (!persistent) args.push('--extensionTestsPath=' + path.resolve('.dev/vscode-tests/suite.cjs'));
console.log('Manual storage mode:', persistent ? 'persistent development profile (no test runner)' : 'extension test storage');
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
// Physical acceptance needs a visible, idle development window; automated runs stay hidden.
const child = spawn(code, args, { env, windowsHide: process.env.RTL_MANUAL_ACCEPTANCE !== '1' && process.env.RTL_EDITOR_PROFILE_PHYSICAL !== '1' && process.env.RTL_WAVEFORM_PHYSICAL_CANCEL !== '1', stdio: 'inherit' });
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', async code => {
  process.exitCode = code ?? 1;
  if (persistent) { console.log('Manual development artifacts:', runRoot); return; }
  try {
    const receipt = JSON.parse(await readFile(path.join(project, '.rtl', 'extension-test.json'), 'utf8'));
    if (receipt.passed !== true) process.exitCode = 1;
  } catch { process.exitCode = 1; console.error('VS Code tests did not write a successful completion receipt.'); }
  console.log('VS Code test artifacts:', runRoot);
});
