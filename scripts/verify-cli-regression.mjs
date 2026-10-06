import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { readHistory } = require('../packages/core/dist/index.js');
const project = process.argv[2];
if (!project) throw Error('Pass a completed isolated full-host project, never a user project.');
const root = path.resolve(project), base = path.resolve('.dev/vscode-tests');
assert.ok(root.startsWith(base + path.sep), 'Only isolated VS Code regression projects may be mutated');
const gui = await readHistory(root), report = { root, guiResults: gui.length, commands: [] };
assert.ok(gui.some(r => r.status === 'failed') && gui.some(r => r.status === 'cancelled'));
async function cli(args, expected = 0, json = false) {
  const output = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.resolve('packages/cli/dist/cli.cjs'), ...args, '--project', root], { windowsHide: true, env: process.env });
    let stdout = '', stderr = ''; child.stdout.on('data', v => { stdout += v; }); child.stderr.on('data', v => { stderr += v; });
    child.on('error', reject); child.on('exit', code => resolve({ code, stdout, stderr }));
  });
  report.commands.push({ args, exitCode: output.code, expected, stderr: output.stderr.slice(-2000) });
  assert.equal(output.code, expected, output.stdout.slice(-1500) + output.stderr);
  return json ? JSON.parse(output.stdout) : output;
}
await mkdir('.dev/audit', { recursive: true });
try {
  await cli(['check']); await cli(['test', 'counter_basic']); await cli(['test', '--all', '--jobs', '2']);
  const history = await cli(['history', '--json', '--verify-inputs'], 0, true);
  const added = history.filter(r => !gui.some(old => old.runId === r.runId));
  assert.equal(added.length, 3); assert.ok(added.every(r => r.status === 'passed' && r.inputSnapshot?.state === 'ready' && r.inputComparison.state === 'matching'));
  for (const name of ['counter_basic', 'counter_reset']) assert.ok(added.some(r => r.name === name) && gui.some(r => r.name === name && r.status === 'passed'));
  const basic = added.find(r => r.name === 'counter_basic');
  report.guiCliStatusAgreement = true;
  report.sameInputFingerprintInGui = gui.some(r => r.name === basic.name && r.status === 'passed' && r.inputIdentity?.fingerprint === basic.inputIdentity?.fingerprint);
  assert.equal(report.sameInputFingerprintInGui, true, 'Compare a GUI run of the same inputs');
  await cli(['test', 'not-a-test'], 1);
  const source = path.join(root, 'tb/counter_basic_tb.sv'), original = await readFile(source, 'utf8');
  try {
    await writeFile(source, 'module counter_basic_tb; initial $fatal(1, "CLI audit expected failure"); endmodule');
    await cli(['test', 'counter_basic'], 1);
    const failed = (await readHistory(root))[0]; assert.equal(failed.status, 'failed');
    const changed = await cli(['history', '--json', '--verify-inputs'], 0, true);
    assert.equal(changed.find(r => r.runId === basic.runId).inputComparison.state, 'changed');
    const manifest = path.join(root, 'rtl.toml'), backup = path.join(root, '.rtl/audit-manifest.toml');
    await rename(manifest, backup);
    try {
      const hierarchy = await cli(['hierarchy', '--run', basic.runId, '--json'], 0, true);
      assert.ok(hierarchy.roots.length); assert.equal(hierarchy.recordedRunId, basic.runId);
      const trace = await cli(['trace', '--run', basic.runId, '--json'], 0, true);
      assert.equal(trace.traceSha256, basic.traceIdentity.sha256); assert.ok(trace.bindings.some(b => b.state === 'matched'));
      const bytes = await readFile(basic.waveform);
      try { await writeFile(basic.waveform, 'damaged trace'); await cli(['trace', '--run', basic.runId, '--json'], 1); }
      finally { await writeFile(basic.waveform, bytes); }
      report.archivedWithoutCurrentManifest = true; report.traceDamageRejected = true;
    } finally { await rename(backup, manifest); }
  } finally { await writeFile(source, original); }
  report.passed = true; report.newResults = 4;
} catch (error) { report.passed = false; report.error = String(error); process.exitCode = 1; }
finally { await writeFile('.dev/audit/cli-receipt.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2)); }
