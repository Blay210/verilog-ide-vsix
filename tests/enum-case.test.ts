import test from 'node:test';
import assert from 'node:assert/strict';
import { enumCaseContext, planEnumCase } from '../packages/semantic/src/enum-case';

const values = [{name:'p::IDLE', value:'0'}, {name:'p::BUSY', value:'1'}];
test('enum action preserves comments and closer with one insertion', () => {
  const source = '  case(state)\n    // keep 한글\n  endcase';
  const context = enumCaseContext(source, source.indexOf('state'))!;
  const edit = planEnumCase(source, context, values, '  ', '\n')!;
  const result = source.slice(0, edit.offset) + edit.text + source.slice(edit.offset);
  assert.ok(result.includes('// keep 한글'));
  assert.equal(result.match(/endcase/g)?.length, 1);
  for (const label of ['p::IDLE:', 'p::BUSY:', 'default:']) assert.ok(result.includes(label));
  assert.equal(result.slice(0, edit.offset) + result.slice(edit.offset + edit.text.length), source);
});
test('enum action rejects existing branches, macros and unsupported contexts', () => {
  for (const source of ['case(state) IDLE: foo(); endcase', 'case(state) `BODY endcase', 'casez(state) endcase', 'case(state + 1) endcase', 'case(state)', '// case(state) endcase', '"case(state) endcase"']) {
    assert.equal(enumCaseContext(source, Math.floor(source.length / 2)), undefined, source);
  }
  const source = 'case(state) endcase', context = enumCaseContext(source, 5)!;
  assert.equal(planEnumCase(source, context, [{name:'A',value:'0'},{name:'B',value:'0'}], '  ', '\n'), undefined);
  assert.equal(planEnumCase(source, context, [{name:'bad.name',value:'0'}], '  ', '\n'), undefined);
  assert.equal(planEnumCase(source, context, [], '  ', '\n'), undefined);
  assert.equal(planEnumCase(source, context, Array.from({length:257},(_,i)=>({name:`S${i}`,value:String(i)})), '  ', '\n'), undefined);
});
test('inline cases, tabs and CRLF retain indentation and accurate expression offsets', () => {
  const source = '\tcase(a) endcase';
  const context = enumCaseContext(source, 7)!;
  assert.equal(source.slice(context.expressionOffset, context.expressionOffset + 1), 'a');
  const edit = planEnumCase(source, context, values, '\t', '\r\n')!;
  assert.ok(edit.text.startsWith('\r\n\t\tp::IDLE: begin\r\n\t\t\t'));
  assert.ok(edit.text.endsWith('\r\n\t'));
});
