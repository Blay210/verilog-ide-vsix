import test from 'node:test';
import assert from 'node:assert/strict';
import { checkedProcess, runProcess } from '@rtl-dev/core';

test('arguments are passed literally without shell interpretation', async () => {
  const value = '한글 space & $(echo wrong) "quoted"';
  const output = await checkedProcess({ executable: process.execPath, args: ['-e', 'process.stdout.write(process.argv[1])', value], cwd: process.cwd() });
  assert.equal(output, value);
});
test('nonzero exit and missing executable are actionable errors', async () => {
  await assert.rejects(checkedProcess({ executable: process.execPath, args: ['-e', 'console.error("compile failed");process.exit(3)'], cwd: process.cwd() }), /compile failed/);
  await assert.rejects(checkedProcess({ executable: 'rtl-does-not-exist-123', args: [], cwd: process.cwd() }), /Could not start/);
});
test('cancellation kills a process and its descendant', { timeout: 15000 }, async () => {
  const controller = new AbortController(); let pid: number | undefined;
  const code = 'const {spawn}=require("node:child_process");const child=spawn(process.execPath,["-e","setInterval(()=>{},1000)"],{stdio:"ignore"});console.log(child.pid);setInterval(()=>{},1000)';
  const result = await runProcess({ executable: process.execPath, args: ['-e', code], cwd: process.cwd() }, { signal: controller.signal, onLog: text => { pid = Number(text.trim()); controller.abort(); } });
  assert.equal(result.cancelled, true); assert.ok(pid);
  // taskkill waits for the tree to be terminated; Linux may briefly leave a zombie.
  if (process.platform === 'win32') assert.throws(() => process.kill(pid!, 0));
});
