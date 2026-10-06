import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, mkdtemp, writeFile, readFile, readdir } from 'node:fs/promises';
import { loadProject } from '@rtl-dev/core';
import { SlangProvider, type HierarchyNode } from '@rtl-dev/semantic';

const flatten = (nodes: HierarchyNode[]): HierarchyNode[] => nodes.flatMap(n => [n, ...flatten(n.children)]);
test('native hierarchy: elaborated parameters, generate, arrays, connections and unsaved isolation', { skip: !process.env.RTL_SEMANTIC_PYTHON }, async () => {
  const base = path.resolve('.dev/semantic'); await mkdir(base, { recursive: true });
  const root = path.join(await mkdtemp(path.join(base, 'hierarchy-')), '한글 project'); await mkdir(root);
  const source = 'module leaf #(parameter W=2, parameter type T=logic)(input logic [W-1:0] a, output logic [W-1:0] y); assign y=a; endmodule\nmodule bank #(parameter W=4, N=2)(input logic [W-1:0] a, output wire [W-1:0] y); for(genvar i=0;i<N;i++) begin:g leaf #(.W(W),.T(logic[1:0])) u(.a(a),.y()); end if(N==2) begin:chosen leaf #(.W(W)) u(.a(a),.y(y)); end else begin:other assign y=a; end endmodule\n';
  const files = { 'rtl.toml': 'version=1\n[project]\nname="hierarchy"\n[sources]\nrtl=["design.sv"]\n[[test]]\nname="two"\ntop="top"\nsources=["two.sv"]\n[[test]]\nname="three"\ntop="top"\nsources=["three.sv"]\n',
    'design.sv': source,
    'two.sv': 'module top; logic [3:0] a; wire [3:0] y; bank #(.W(4),.N(2)) dut(.*); leaf v[1:0](.a(2\'b01),.y()); wire [7:0] bus_in, bus_out; leaf #(.W(4)) split[1:0](bus_in,bus_out); endmodule',
    'three.sv': 'module top; logic [7:0] a; wire [7:0] y; bank #(.W(8),.N(3)) dut(a,y); endmodule' };
  for (const [name, text] of Object.entries(files)) await writeFile(path.join(root, name), text);
  const project = await loadProject(root), cache = path.join(base, path.basename(path.dirname(root)) + '-cache');
  const provider = new SlangProvider(process.env.RTL_SEMANTIC_PYTHON!, path.resolve('packages/semantic/python/analyze.py'), cache);
  const two = await provider.hierarchy(project, 'two', []);
  assert.equal(two.diagnostics.filter(d => d.severity === 'error').length, 0, JSON.stringify(two.diagnostics));
  const nodes = flatten(two.roots), dut = nodes.find(n => n.id === 'top.dut')!;
  assert.ok(dut); assert.deepEqual(dut.instancePath, ['top','dut']); assert.equal(dut.ports[0].signalType?.width,4); assert.equal(dut.parameters.find(p => p.name === 'W')?.value, '4');
  assert.equal(dut.parameters.find(p => p.name === 'W')?.overridden, true);
  assert.equal(dut.ports[0].type, 'logic[3:0]'); assert.equal(dut.ports[0].connection.text, 'a');
  assert.deepEqual(dut.ports[0].connection.references.map(r => r.path), ['top.a']);
  assert.equal(nodes.find(n => n.id === 'top.dut.g[1].u')?.parameters.find(p => p.name === 'T')?.value, 'logic[1:0]');
  assert.equal(nodes.find(n => n.id === 'top.dut.g[1].u')?.parameters.find(p => p.name === 'T')?.overridden, true);
  assert.ok(nodes.some(n => n.id === 'top.dut.g[1].u')); assert.ok(!nodes.some(n => n.id.includes('other')));
  assert.deepEqual(nodes.find(n => n.id === 'top.dut.g[1].u')!.instancePath,['top','dut','g[1]','u']);
  assert.deepEqual(nodes.find(n => n.id === 'top.v[0]')!.instancePath,['top','v[0]']);
  assert.ok(nodes.some(n => n.id === 'top.v[0]')); assert.ok(nodes.some(n => n.id === 'top.v[1]'));
  const leaf = nodes.find(n => n.id === 'top.dut.chosen.u')!;
  assert.equal(leaf.ports[1].connection.text, 'y'); assert.deepEqual(leaf.ports[1].connection.references.map(r => r.path), ['top.dut.y']);
  assert.equal(leaf.definition?.offset, source.indexOf('leaf')); assert.equal(leaf.location.offset, source.indexOf('u(.a(a),.y(y))'));
  assert.equal(nodes.find(n => n.id === 'top.v[0]')!.ports[1].connection.kind, 'unconnected');
  assert.equal(nodes.find(n => n.id === 'top.split[0]')!.ports[0].connection.text, 'bus_in[3:0]');
  assert.equal(nodes.find(n => n.id === 'top.split[1]')!.ports[1].connection.text, 'bus_out[7:4]');
  const three = flatten((await provider.hierarchy(project, 'three', [])).roots);
  assert.equal(three.find(n => n.id === 'top.dut')!.ports[0].type, 'logic[7:0]');
  assert.ok(three.some(n => n.id === 'top.dut.g[2].u')); assert.ok(!three.some(n => n.id.includes('chosen')));
  const updated = await provider.hierarchy(project, 'two', [{ file: path.join(root, 'two.sv'), text: files['two.sv'].replace('.N(2)', '.N(1)') }]);
  assert.ok(!flatten(updated.roots).some(n => n.id === 'top.dut.g[1].u'));
  assert.equal(await readFile(path.join(root, 'two.sv'), 'utf8'), files['two.sv']);
  const invalid = await provider.hierarchy(project, 'two', [{ file: path.join(root, 'two.sv'), text: 'module top; missing_module u(); endmodule' }]);
  assert.deepEqual(invalid.roots, []); assert.ok(invalid.diagnostics.some(d => d.severity === 'error'));
  const interfaces = await provider.hierarchy(project, 'two', [
    { file: path.join(root, 'design.sv'), text: 'interface bus; logic a; endinterface module sink(bus b); endmodule' },
    { file: path.join(root, 'two.sv'), text: 'module top; bus b(); sink dut(b); endmodule' }
  ]);
  assert.equal(interfaces.diagnostics.filter(d => d.severity === 'error').length, 0);
  assert.equal(flatten(interfaces.roots).find(n => n.id === 'top.dut')?.ports[0].connection.kind, 'interface');
  const roots = await provider.hierarchy({ ...project, tests: [] }, undefined, []);
  assert.equal(roots.roots[0].ports[0].connection.kind, 'top');
  await assert.rejects(provider.hierarchy(project, undefined, []), /Choose/);
  const abort = new AbortController(); abort.abort(); await assert.rejects(provider.hierarchy(project, 'two', [], abort.signal));
  assert.deepEqual(await readdir(cache), []);
});
