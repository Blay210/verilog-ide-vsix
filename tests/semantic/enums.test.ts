import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { loadProject } from '@rtl-dev/core';
import { SlangProvider } from '@rtl-dev/semantic';

test('native enum hierarchy extracts package/internal/generated/signed values without array guessing', { skip: !process.env.RTL_SEMANTIC_PYTHON }, async () => {
  const base = path.resolve('.dev/semantic'); await mkdir(base, { recursive: true });
  const root = await mkdtemp(path.join(base, 'enums-'));
  await writeFile(path.join(root, 'rtl.toml'), 'version=1\n[project]\nname="enums"\n[sources]\nrtl=["design.sv"]\n[[test]]\nname="states"\ntop="tb"\nsources=["design.sv"]\n');
  await writeFile(path.join(root, 'design.sv'), `package states; typedef enum logic [1:0] {IDLE=0, LOAD=1, DONE=3} state_t; endpackage
module leaf; states::state_t state; states::state_t array_state[2]; typedef enum logic signed [3:0] {NEG=-1, ZERO=0} signed_t; signed_t signed_state; endmodule
module tb; leaf dut(); for(genvar i=0;i<2;i++) begin:g leaf u(); end endmodule`);
  const provider = new SlangProvider(process.env.RTL_SEMANTIC_PYTHON!, path.resolve('packages/semantic/python/analyze.py'), path.join(root, '.rtl/cache'));
  const design = await provider.hierarchy(await loadProject(root), 'states', []);
  assert.deepEqual(design.diagnostics.filter(d => d.severity === 'error'), []);
  const dut = design.roots[0].children.find(n => n.name === 'dut')!;
  assert.deepEqual(dut.enumSignals?.find(e => e.name === 'state')?.values, [{ name: 'IDLE', bits: '00' }, { name: 'LOAD', bits: '01' }, { name: 'DONE', bits: '11' }]);
  assert.deepEqual(dut.enumSignals?.find(e => e.name === 'signed_state')?.values, [{ name: 'NEG', bits: '1111' }, { name: 'ZERO', bits: '0000' }]);
  assert.equal(dut.enumSignals?.find(e => e.name === 'array_state'), undefined);
  const g = design.roots[0].children.find(n => n.kind === 'array')!;
  assert.deepEqual(g.children[1].children[0].instancePath, ['tb', 'g[1]', 'u']);
  assert.equal(g.children[1].children[0].enumSignals?.[0].name, 'state');
});
