import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { loadProject } from '../../packages/core/src/config';
import { SlangProvider, portCompletions, portSignature } from '../../packages/semantic/src/index';

const python = process.env.RTL_SEMANTIC_PYTHON;
test('real slang preserves port intelligence while an instance is unfinished at EOF', { skip: !python }, async () => {
  await mkdir('.dev/tests', { recursive: true });
  const root = await mkdtemp(path.resolve('.dev/tests/port-recovery-'));
  await mkdir(path.join(root, 'rtl')); await mkdir(path.join(root, 'tb'));
  await writeFile(path.join(root, 'rtl.toml'), 'version=1\n[project]\nname="recovery"\n[sources]\nrtl=["rtl/*.sv"]\n[[test]]\nname="basic"\ntop="bench"\nsources=["tb/bench.sv"]\n');
  const dut = 'module dut #(parameter W=4)(input logic clk, input logic [W-1:0] data, output logic ready); endmodule\n';
  const original = 'module bench; dut u(); endmodule\n';
  const file = path.join(root, 'tb/bench.sv');
  await writeFile(path.join(root, 'rtl/dut.sv'), dut); await writeFile(file, original);
  const provider = new SlangProvider(python!, path.resolve('packages/semantic/python/analyze.py'), path.join(root, '.rtl/cache'));
  const project = await loadProject(root);
  for (const override of ['', '#(.W(9)) ']) for (const tail of ['', ');', '); endmodule']) {
    const prefix = `// 한글 😀\nmodule bench; logic clk; dut ${override}u(.clk(clk), .`;
    const text = prefix + tail;
    const analysis = await provider.analyze(project, [{ file, text }]);
    const result = portCompletions(analysis, file, text, prefix.length);
    assert.deepEqual(result.ports.map(p => p.name), ['data', 'ready'], JSON.stringify({ tail, instances: analysis.instances, diagnostics: analysis.diagnostics }));
    assert.equal(result.ports[0].type, override ? 'logic[8:0]' : 'logic[3:0]');
    if (!tail.includes('endmodule')) assert.ok(analysis.diagnostics.some(d => d.severity === 'error'), 'Original syntax diagnostics must remain');
  }
  assert.equal(await readFile(file, 'utf8'), original);
  assert.equal(await readFile(path.join(root, 'rtl/dut.sv'), 'utf8'), dut);
  const outside = path.join(root, 'rtl/new_module.sv');
  await writeFile(outside, 'module new_module; endmodule\n');
  const updated = await loadProject(root);
  const unfinished = 'module new_module; logic clk; dut #(.W(11)) child(.clk(clk), .';
  const extra = await provider.analyze(updated, [{ file: outside, text: unfinished }]);
  const ports = portCompletions(extra, outside, unfinished, unfinished.length).ports;
  assert.deepEqual(ports.map(p => p.name), ['data', 'ready'], JSON.stringify(extra));
  assert.equal(ports[0].type, 'logic[10:0]');
  const call = unfinished.slice(0, -1) + '.data(';
  const help = await provider.analyze(updated, [{ file: outside, text: call }]);
  assert.match(portSignature(help, outside, call, call.length)?.label ?? '', /logic\[10:0\] data/);
  assert.equal(await readFile(outside, 'utf8'), 'module new_module; endmodule\n');
});
