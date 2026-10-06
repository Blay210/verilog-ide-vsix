import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createProject, loadProject, runTest } from '@rtl-dev/core';
import { detectTools } from '@rtl-dev/toolchain';
import { VerilatorBackend } from '@rtl-dev/verilator';

test('native Windows build timeout and cancellation terminate promptly and allow recovery', {
  skip: process.platform !== 'win32' || process.env.RTL_INTEGRATION !== '1', timeout: 180000
}, async () => {
  const tools = await detectTools(); assert.ok(tools.toolchain);
  assert.equal(path.basename(tools.toolchain.compiler.executable), 'verilator_bin.exe');
  assert.deepEqual(tools.toolchain.compiler.args, []);
  const base = path.resolve('.dev/integration'); await mkdir(base, { recursive: true });
  const root = await mkdtemp(path.join(base, 'termination-')); await createProject(root, true);
  const project = await loadProject(root), backend = new VerilatorBackend(tools.toolchain);
  const assertNoBuildProcesses = async () => {
    const script = '$root=$env:RTL_TERMINATION_ROOT.Replace("\\","/"); @(Get-CimInstance Win32_Process -ErrorAction Stop | Where-Object { $_.CommandLine -and $_.CommandLine.Replace("\\","/").Contains($root) } | Select-Object -ExpandProperty ProcessId) | ConvertTo-Json -Compress';
    const { stdout } = await promisify(execFile)('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      env: { ...process.env, RTL_TERMINATION_ROOT: root }, windowsHide: true, timeout: 15000
    });
    assert.equal(stdout.trim(), '', `Build processes survived termination: ${stdout}`);
  };
  const timed = await runTest(project, { ...project.tests[0], timeoutMs: 1500 }, backend);
  assert.equal(timed.status, 'timedOut');
  // Local acceptance budget includes Windows taskkill overhead, not an exact deadline.
  assert.ok(timed.durationMs < 7000, `Build timeout took ${timed.durationMs} ms`);
  await assertNoBuildProcesses();
  const controller = new AbortController(); let cancelledAt = 0;
  const started = Date.now();
  const cancelled = await runTest(project, project.tests[0], backend, { signal: controller.signal, onLog(text) {
    if (!cancelledAt && text.includes('g++')) { cancelledAt = Date.now(); controller.abort(); }
  } });
  assert.ok(cancelledAt, 'Cancellation must occur during C++ compilation');
  assert.equal(cancelled.status, 'cancelled');
  assert.ok(Date.now() - cancelledAt < 7000, `Build cancellation took ${Date.now() - cancelledAt} ms`);
  assert.ok(cancelled.durationMs >= cancelledAt - started - 100);
  await assertNoBuildProcesses();
  const recovered = await runTest(project, project.tests[1], backend);
  assert.equal(recovered.status, 'passed', recovered.message); assert.ok(recovered.waveform);
});
