import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, mkdtemp, writeFile, chmod, readFile } from 'node:fs/promises';
import { loadProject, runTest, loadRecordedInputs, loadRecordedTrace } from '@rtl-dev/core';
import { detectTools, detectSemanticRuntime } from '@rtl-dev/toolchain';
import { VerilatorBackend } from '@rtl-dev/verilator';
import { SlangProvider } from '@rtl-dev/semantic';
import { parseVcd, valueAt, formatEnumValue } from '@rtl-dev/waveform';
import { recordedEnums } from '../../packages/vscode/src/recorded-enums';

test('native enum trace uses retained definitions and rejects changes during analysis', { skip: process.env.RTL_INTEGRATION !== '1', timeout: 180000 }, async () => {
  const base = path.resolve('.dev/integration'); await mkdir(base, { recursive: true });
  const root = await mkdtemp(path.join(base, 'enum-한글 '));
  await writeFile(path.join(root, 'rtl.toml'), 'version=1\n[project]\nname="enum"\n[sources]\nrtl=["design.sv"]\n[[test]]\nname="states"\ntop="tb"\nsources=["tb.sv"]\n');
  await writeFile(path.join(root, 'design.sv'), `module leaf(output logic [1:0] raw);
    timeunit 1ns; timeprecision 1ps;
    typedef enum logic [1:0] {IDLE=0,LOAD=1,DONE=3} state_t;
    state_t state=IDLE; assign raw=state;
    initial begin #5 state=LOAD; #5 state=DONE; end
    endmodule`);
  await writeFile(path.join(root, 'tb.sv'), 'module tb; timeunit 1ns; timeprecision 1ps; wire [1:0] raw; leaf dut(.*); initial begin $dumpfile("wave.vcd"); $dumpvars(0,tb); #15 $finish; end endmodule');
  const project = await loadProject(root); project.tests[0].timeoutMs = 120000;
  const tools = await detectTools(), python = await detectSemanticRuntime(); assert.ok(tools.toolchain); assert.ok(python);
  const result = await runTest(project, project.tests[0], new VerilatorBackend(tools.toolchain));
  assert.equal(result.status, 'passed', result.message); assert.equal(result.traceIdentity?.state, 'ready');
  const wave = parseVcd((await loadRecordedTrace(result)).bytes.toString());
  const provider = new SlangProvider(python, path.resolve('packages/semantic/python/analyze.py'), path.join(root, '.rtl/semantic-cache'));
  await writeFile(project.sources[0], 'module leaf; typedef enum logic[1:0] {NEW_IDLE=0,NEW_LOAD=1} changed; endmodule');
  const labels = await recordedEnums(result, wave, provider, new AbortController().signal);
  const state = wave.signals.find(s => s.reference === 'state' && s.scopeSegments?.includes('dut'))!;
  assert.ok(state); const changes = wave.channels.get(state.code)!;
  assert.equal(formatEnumValue(valueAt(changes, 0n), 'auto', labels[state.id]), 'IDLE');
  assert.equal(formatEnumValue(valueAt(changes, BigInt(wave.end)/3n), 'auto', labels[state.id]), 'LOAD');
  assert.equal(formatEnumValue(valueAt(changes, BigInt(wave.end)*2n/3n), 'auto', labels[state.id]), 'DONE');
  for (const raw of wave.signals.filter(s => s.reference === 'raw')) assert.equal(labels[raw.id], undefined);
  await writeFile('.dev/u05-native-receipt.json', JSON.stringify({ passed: true, root, runId: result.runId, waveform: result.waveform, mappedSignals: Object.keys(labels), values: labels[state.id], originalChanged: true }, null, 2));
  const saved = await loadRecordedInputs(result), file = saved.project.sources[0], original = await readFile(file);
  const modifying = { ...provider, hierarchy: async (...args: Parameters<typeof provider.hierarchy>) => {
    const design = await provider.hierarchy(...args); await chmod(file, 0o666); await writeFile(file, '// changed while enum analysis ran'); return design;
  } } as SlangProvider;
  await assert.rejects(recordedEnums(result, wave, modifying, new AbortController().signal), /modified/);
  await writeFile(file, original);
  const aborted = new AbortController(); aborted.abort();
  await assert.rejects(recordedEnums(result, wave, provider, aborted.signal), /abort/i);
});
