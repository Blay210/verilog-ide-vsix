import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { connectionPort, connectionRank, callableContext, callableSignature, portCompletions, parameterSignature, portSignature, symbolAt, symbolCompletionContext, type Analysis } from '../packages/semantic/src/index';

const file = path.resolve('test.sv');
const location = { file, offset: 0, line: 0, character: 0 };
const ports = ['data', 'done', 'clock'].map(name => ({ name, type: 'logic', direction: 'in', location }));
function complete(marked: string) {
  const offset = marked.indexOf('|'), text = marked.replace('|', '');
  const analysis: Analysis = { modules: [], diagnostics: [], instances: [{ name: 'u', module: 'dut', start: location, end: { ...location, offset: text.length }, ports }] };
  return portCompletions(analysis, file, text, offset).ports.map(p => p.name);
}
test('named-port completion excludes connected ports before and after the cursor', () => {
  assert.deepEqual(complete('u(.clock(clk), .d|, .done())'), ['data']);
  assert.deepEqual(complete('u(.da|ta())'), ['data']);
  const text = 'u(.data())';
  const analysis: Analysis = { modules: [], diagnostics: [], instances: [{ name: 'u', module: 'dut', start: location, end: { ...location, offset: text.length }, ports }] };
  const result = portCompletions(analysis, file, text, 5);
  assert.equal(text.slice(result.start, result.end), 'data', 'Replacement covers the whole identifier, not only its typed prefix');
});
test('named-port completion is suppressed in expressions, comments and strings', () => {
  assert.deepEqual(complete('u(.data(object.d|))'), []);
  assert.deepEqual(complete('u(/* .d| */)'), []);
  assert.deepEqual(complete('u(.data(".d|"))'), []);
  assert.deepEqual(complete('u(.data(fn(1, object.d|)))'), []);
});
test('module hover does not use lexical text from comments', () => {
  const analysis: Analysis = { modules: [{ name: 'dut', kind: 'module', location, ports }], instances: [], diagnostics: [] };
  assert.equal(symbolAt(analysis, file, '// dut u();', 4), undefined);
  assert.equal(symbolAt(analysis, file, 'dut u();', 1)?.label, 'module dut');
});

test('scope completion context distinguishes package names, whole identifiers and member access', () => {
  const marked = 'return pkg::wo|rd_t;';
  const text = marked.replace('|', '');
  const context = symbolCompletionContext(text, marked.indexOf('|'))!;
  assert.equal(context.qualifier, 'pkg'); assert.equal(context.prefix, 'wo');
  assert.equal(text.slice(context.start, context.end), 'word_t');
  assert.equal(symbolCompletionContext('pkg::', 5)?.qualifier, 'pkg');
  assert.equal(symbolCompletionContext('arg', 3)?.prefix, 'arg');
  for (const text of ['obj.field', 'pkg::cls::member', '// pkg::', '"pkg::', '`define X pkg::', '$dis', '123']) {
    assert.equal(symbolCompletionContext(text, text.length), undefined, text);
  }
});

test('named ports support implicit connections and whitespace without consuming the edited name', () => {
  assert.deepEqual(complete('u(.clock, .|)'), ['data', 'done']);
  assert.deepEqual(complete('u(. |, .clock, .done())'), ['data']);
  assert.deepEqual(complete('u(. da|ta, .clock)'), ['data']);
  assert.deepEqual(complete('u(.clock /* connected */, . d|)'), ['data', 'done']);
  assert.deepEqual(complete('u(.*, . d|)'), ['data', 'done']);
  assert.deepEqual(complete('u(.data(object. d|))'), []);
});

test('instance signature follows named/positional ports and leaves nested calls alone', () => {
  function signature(marked: string) {
    const offset = marked.indexOf('|'), text = marked.replace('|', '');
    return portSignature({ modules: [], diagnostics: [], instances: [{ name: 'u', module: 'dut', start: location, end: { ...location, offset: text.length }, ports }] }, file, text, offset);
  }
  assert.equal(signature('u(|)')?.activeParameter, 0);
  assert.equal(signature('u({a,b}, |)')?.activeParameter, 1);
  assert.equal(signature('u(.clock(|))')?.activeParameter, 2);
  assert.equal(signature('u(.clock(), .data(|))')?.activeParameter, 0);
  for (const text of ['u(.clock(fn(|)))', 'u()|', 'u(.unknown(|))', 'u("abc|', 'u(.*|)']) assert.equal(signature(text), undefined, text);
});

test('parameter guidance uses compiler ranges and declaration defaults', () => {
  function help(marked: string) {
    const offset = marked.indexOf('|'), text = marked.replace('|', '');
    return parameterSignature({ diagnostics: [], modules: [{name: 'dut', kind: 'module', location, ports, parameters: [{ name: 'W', type: 'int', defaultValue: '8' }, { name: 'T', type: 'type', defaultValue: 'logic' }]}], instances: [{name: 'u', module: 'dut', start: {...location, offset: text.length}, end: {...location, offset: text.length}, ports, parameterStart: location, parameterEnd: {...location, offset: text.length}}] }, file, text, offset);
  }
  assert.equal(help('#(|)')?.activeParameter, 0);
  assert.equal(help('#({1,2}, |)')?.activeParameter, 1);
  assert.equal(help('#(.T(|))')?.activeParameter, 1);
  assert.match(help('#(.W(|))')!.label, /int W = 8/);
  for (const text of ['#(.BAD(|))', '#(.W(fn(|)))', '#(8)|', '#("x|', '#(/* hi| */)']) assert.equal(help(text), undefined, text);
});

test('callable context selects innermost call and rejects unsupported members', () => {
  for (const [text, name] of [['f(g(', 'g'], ['p::f(.a(', 'f'], ['f({a,b}, ', 'f']]) assert.equal(callableContext(text, text.length)?.name, name);
  for (const text of ['obj.f(', 'p::cls::f(', '// f(', '"f(', 'function int f(', '$display(']) assert.equal(callableContext(text, text.length), undefined, text);
  const text = 'p::f(.b(';
  const context = callableContext(text, text.length)!;
  const symbol = {name: 'f', kind: 'function' as const, detail: '', location, callable: {kind: 'function', returnType: 'int', arguments: [{name:'a',label:'input int a'}, {name:'b',label:'input string b = "ok"'}]}};
  assert.equal(callableSignature(symbol, context)?.activeParameter, 1);
  assert.match(callableSignature(symbol, context)!.label, /p::f/);
});

test('connection ranking keeps alternatives and prioritizes compiler width/sign/state matches', () => {
  const shape = {text:'logic[7:0]', simpleIntegral:true, width:8, signed:false, fourState:true};
  const port = {...ports[0], signalType:shape};
  const candidate = {name:'data',kind:'variable' as const,detail:'',location,signalType:shape};
  const good = connectionRank(port,candidate);
  const wrongSign = connectionRank(port,{...candidate,signalType:{...shape,signed:true}});
  const wrongWidth = connectionRank(port,{...candidate,signalType:{...shape,width:4}});
  assert.ok(good.sortText < wrongSign.sortText && wrongSign.sortText < wrongWidth.sortText);
  assert.ok(connectionRank(port,{...candidate,name:'data_copy'}).sortText > good.sortText);
  assert.equal(connectionRank(port,{...candidate,kind:'constant'}).reason, undefined);
  assert.equal(connectionRank(port,{...candidate,signalType:{...shape,simpleIntegral:false}}).reason, undefined);
  assert.match(wrongWidth.reason!, /Width differs/);
  assert.equal(connectionRank(port,{...candidate,signalType:{...shape,signed:undefined}}).reason,undefined);
  function target(marked:string) {
    const offset=marked.indexOf('|'), text=marked.replace('|','');
    return connectionPort({modules:[],diagnostics:[],instances:[{name:'u',module:'dut',start:location,end:{...location,offset:text.length},ports:[port]}]},file,text,offset);
  }
  assert.equal(target('u(.data( |))')?.name,'data');
  assert.equal(target('u(.data(da|))')?.name,'data');
  for (const text of ['u(.data(fn(|)))','u(.data(a + |))','u(.data(obj.|))','u(.data("hi|"))','u(.unknown(|))']) assert.equal(target(text),undefined,text);
});
