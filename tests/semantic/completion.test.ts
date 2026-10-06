import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, mkdtemp, writeFile, readFile, readdir } from 'node:fs/promises';
import { loadProject } from '../../packages/core/src/config';
import { SlangProvider, callableContext, callableSignature, enumCaseContext, planEnumCase } from '../../packages/semantic/src/index';

const python = process.env.RTL_SEMANTIC_PYTHON;
const packages = `package p;
  parameter int WIDTH=8;
  parameter int clash=1;
  typedef logic [WIDTH-1:0] word_t;
  typedef enum {IDLE, BUSY} state_t;
  function int plus(input int a); return a+1; endfunction
endpackage
package q; parameter int clash=2; endpackage
package bridge; import p::*; export p::WIDTH; endpackage
`;
const source = `module top;
  import p::*;
  import q::*;
  logic module_signal;
  function automatic int work(input int argument);
    int early_value;
    /*order*/ int later;
    begin : inner_block
      int WIDTH;
      int inner_value;
      /* 한글 😀 */ $display(/*inner*/ argument);
    end
    $display(/*outer*/ early_value);
    return argument;
  endfunction
  function int sibling(); int secret; return secret; endfunction
  initial $display(/*package*/ p::WIDTH);
endmodule
module isolated;
  int isolated_value;
  initial $display(/*isolated*/ isolated_value);
endmodule
`;
async function fixture() {
  await mkdir('.dev/tests', { recursive: true });
  const root = await mkdtemp(path.resolve('.dev/tests/scope 한글 '));
  await mkdir(path.join(root, 'rtl'));
  const pkg = path.join(root, 'rtl/pkg.sv'), file = path.join(root, 'rtl/main.sv');
  await writeFile(path.join(root, 'rtl.toml'), 'version=1\n[project]\nname="scopes"\n[sources]\npackages=["rtl/pkg.sv"]\nrtl=["rtl/main.sv"]\n');
  await writeFile(pkg, packages); await writeFile(file, source);
  const project = await loadProject(root);
  const cache = path.join(root, '.rtl/cache');
  const provider = new SlangProvider(python!, path.resolve('packages/semantic/python/analyze.py'), cache);
  return { root, pkg, file, project, cache, provider };
}
test('real slang enum aliases resolve legal labels and unsaved package changes', { skip: !python }, async () => {
  const f = await fixture();
  const source = 'module top; typedef p::state_t alias_t; alias_t state; initial begin case(state) endcase end endmodule';
  const at = async (text: string, pkg = packages) => {
    const entries = await f.provider.complete(f.project, [{file:f.file,text}, {file:f.pkg,text:pkg}], {file:f.file,offset:text.indexOf('state)')});
    return entries.find(e=>e.name === 'state')?.enumValues;
  };
  assert.deepEqual((await at(source))?.map(v=>v.name), ['p::IDLE','p::BUSY']);
  assert.deepEqual((await at(source.replace('module top;', 'module top; import p::*;')))?.map(v=>v.name), ['IDLE','BUSY']);
  assert.deepEqual((await at(source, packages.replace('IDLE', 'WAIT')))?.map(v=>v.name), ['p::WAIT','p::BUSY']);
  assert.equal(await at(source.replace('alias_t state', 'logic state')), undefined);
  const shadowed = source.replace('alias_t state;', 'alias_t state; int IDLE;');
  assert.deepEqual((await at(shadowed.replace('module top;', 'module top; import p::*;')))?.map(v=>v.name), ['p::IDLE','BUSY']);
  const duplicated = await at(source, packages.replace('{IDLE, BUSY}', '{IDLE=0, BUSY=0}'));
  assert.ok(duplicated);
  assert.equal(planEnumCase(source, enumCaseContext(source, source.indexOf('case('))!, duplicated, '  ', '\n'), undefined);
  const parameterized = 'module top #(parameter int V=3); typedef enum int {START=V, STOP=V+1} state_t; state_t state; initial case(state) endcase endmodule';
  assert.deepEqual((await at(parameterized))?.map(v=>v.name), ['START','STOP']);
  assert.equal(await at(parameterized.replace('{START=V, STOP=V+1}', '{START=missing, STOP=V+1}')), undefined);
});
test('real slang package completion includes public symbols and respects exports', { skip: !python }, async () => {
  const f = await fixture();
  const query = { file: f.file, offset: source.indexOf('/*package*/'), qualifier: 'p' };
  const entries = await f.provider.complete(f.project, [], query);
  const names = entries.map(e => e.name);
  for (const name of ['WIDTH', 'word_t', 'state_t', 'IDLE', 'BUSY', 'plus']) assert.ok(names.includes(name), `${name}: ${names}`);
  assert.ok(!names.includes('module_signal') && !names.includes('argument'));
  assert.match(entries.find(e => e.name === 'plus')!.detail, /int plus\(int a\)/);
  const exported = await f.provider.complete(f.project, [], { ...query, qualifier: 'bridge' });
  assert.deepEqual(exported.map(e => e.name), ['WIDTH']);
  assert.deepEqual(await f.provider.complete(f.project, [], { ...query, qualifier: 'unknown_package' }), []);
});
test('real slang follows lexical scope, declaration order, shadowing and ambiguous imports', { skip: !python }, async () => {
  const f = await fixture();
  const at = (mark: string) => f.provider.complete(f.project, [], { file: f.file, offset: source.indexOf(`/*${mark}*/`) });
  const inner = await at('inner'); const names = inner.map(e => e.name);
  for (const name of ['argument', 'early_value', 'later', 'inner_value', 'module_signal', 'word_t']) assert.ok(names.includes(name), `${name}: ${names}`);
  for (const name of ['secret', 'isolated_value', 'clash']) assert.ok(!names.includes(name), `${name}: ${names}`);
  assert.equal(inner.find(e => e.name === 'WIDTH')!.kind, 'variable');
  const outer = await at('outer');
  assert.ok(!outer.some(e => e.name === 'inner_value'));
  assert.equal(outer.find(e => e.name === 'WIDTH')!.kind, 'constant');
  const order = await at('order');
  assert.ok(order.some(e => e.name === 'early_value')); assert.ok(!order.some(e => e.name === 'later'));
  const isolated = await at('isolated');
  assert.ok(!isolated.some(e => ['WIDTH', 'word_t', 'module_signal', 'argument'].includes(e.name)));
  assert.ok(isolated.some(e => e.name === 'isolated_value'));
});
test('real slang completion uses unsaved package and local declarations without writing sources', { skip: !python }, async () => {
  const f = await fixture();
  const changedPackage = packages.replace('WIDTH=8', 'NEW_WIDTH=8').replaceAll('[WIDTH-1:0]', '[NEW_WIDTH-1:0]');
  const changedSource = source.replaceAll('inner_value', 'fresh_local');
  const overlays = [{ file: f.pkg, text: changedPackage }, { file: f.file, text: changedSource }];
  const entries = await f.provider.complete(f.project, overlays, { file: f.file, offset: changedSource.indexOf('/*inner*/') });
  assert.ok(entries.some(e => e.name === 'fresh_local')); assert.ok(!entries.some(e => e.name === 'inner_value'));
  const qualified = await f.provider.complete(f.project, overlays, { file: f.file, offset: changedSource.indexOf('/*package*/'), qualifier: 'p' });
  assert.ok(qualified.some(e => e.name === 'NEW_WIDTH')); assert.ok(!qualified.some(e => e.name === 'WIDTH'));
  assert.equal(await readFile(f.pkg, 'utf8'), packages); assert.equal(await readFile(f.file, 'utf8'), source);
  assert.deepEqual(await readdir(f.cache), []);
});

test('real slang handles incomplete package expressions and file-level imports', { skip: !python }, async () => {
  const f = await fixture();
  for (const text of ['import p::', 'module top; initial $display(p::); endmodule\n']) {
    const entries = await f.provider.complete(f.project, [{ file: f.file, text }], { file: f.file, offset: text.indexOf('p::') + 3, qualifier: 'p' });
    assert.ok(entries.some(e => e.name === 'WIDTH'), JSON.stringify(entries));
  }
  assert.deepEqual(await f.provider.complete(f.project, [], { file: path.join(f.root, 'not-configured.sv'), offset: 0, qualifier: 'p' }), []);
  const other = path.join(f.root, 'not-configured.sv');
  assert.deepEqual(await f.provider.complete(f.project, [{ file: other, text: 'import p::' }], { file: other, offset: 10, qualifier: 'p' }), []);
});

test('real slang suppresses unsupported class scopes and isolates loop locals', { skip: !python }, async () => {
  const f = await fixture();
  const text = `module top;
  int module_value;
  initial begin
    for (int index=0; index<3; index++) begin $display(/*loop*/ index); end
    $display(/*after*/ module_value);
  end
  class object_t; int member; function int method(); return /*class*/ member; endfunction endclass
endmodule\n`;
  const overlays = [{ file: f.file, text }];
  const loop = await f.provider.complete(f.project, overlays, { file: f.file, offset: text.indexOf('/*loop*/') });
  assert.ok(loop.some(e => e.name === 'index'));
  const after = await f.provider.complete(f.project, overlays, { file: f.file, offset: text.indexOf('/*after*/') });
  assert.ok(!after.some(e => e.name === 'index'));
  const cls = await f.provider.complete(f.project, overlays, { file: f.file, offset: text.indexOf('/*class*/') });
  assert.deepEqual(cls, []);
});


test('real slang callable signatures resolve defaults, tasks and package scope', { skip: !python }, async () => {
  const f = await fixture();
  const text = `module top;
    import p::*;
    function int local_fn(input int foo, input string boo="hello"); return foo; endfunction
    task emit_value(output int value); value=1; endtask
    int out_value;
    initial begin out_value=local_fn(1, "x"); emit_value(out_value); out_value=p::plus(1); end
  endmodule`;
  for (const [needle, name, kind, expected] of [['local_fn(1, ', 'local_fn', 'function', 'input string boo ="hello"'], ['emit_value(out', 'emit_value', 'task', 'output int value'], ['p::plus(', 'plus', 'function', 'input int a']]) {
    const offset = text.lastIndexOf(needle) + needle.length;
    const context = callableContext(text, offset)!;
    const symbols = await f.provider.complete(f.project, [{file:f.file,text}], {file:f.file, offset:context.start, qualifier:context.qualifier});
    const symbol = symbols.find(s=>s.name===name)!;
    assert.equal(symbol.callable?.kind, kind);
    const help = callableSignature(symbol, context)!;
    assert.ok(help.label.replace(/\s/g,'').includes(expected.replace(/\s/g,'')), help.label);
  }
});
