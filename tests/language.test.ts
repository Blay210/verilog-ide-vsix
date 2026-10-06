import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { basicCompletions, planBlockEnter, scanCode, planTemplate } from '../packages/language/src/index';

test('explicit RTL templates contain native tab stops and respect lexical/existing source boundaries', () => {
  const template = (text: string, language: 'verilog' | 'systemverilog' = 'systemverilog') => { const offset = text.indexOf('|'); return planTemplate(text.replace('|', ''), offset, language); };
  assert.equal(template('module|')?.snippet, 'module $1 (\n\t$2\n);\n\t$0\nendmodule');
  assert.equal(template('package|')?.snippet, 'package $1;\n\t$0\nendpackage');
  assert.equal(template('unique case|')?.snippet, 'case ($1)\n\t$0\nendcase');
  assert.equal(template('if (ok) begin|')?.snippet, 'begin${1}end$0');
  assert.equal(template('begin|\nend')?.snippet, 'begin${0}');
  assert.equal(template('begin| end')?.snippet, 'begin${0}');
  assert.equal(enter('begin|end'), 'begin\n    |\nend');
  for (const source of ['// module|', '"package|', '`define X begin|', 'pkg::module|', 'object.begin|', 'module| existing;', 'module|\nendmodule', 'case|\nendcase', 'module|_name', 'always|', 'if|', 'for|']) assert.equal(template(source), undefined, source);
  assert.equal(template('package|', 'verilog'), undefined);
});

function enter(source: string, unit = '    ', eol: '\n' | '\r\n' = '\n'): string | undefined {
  const offset = source.indexOf('|');
  const text = source.slice(0, offset) + source.slice(offset + 1);
  const edit = planBlockEnter(text, offset, { unit, eol });
  return edit && text.slice(0, offset) + edit.beforeCursor + '|' + edit.afterCursor + text.slice(edit.replaceEnd);
}

test('class and fork expansions use explicit native fields and language-specific join choices', () => {
  assert.equal(planTemplate('class', 5, 'systemverilog')?.snippet, 'class $1;\n\t$0\nendclass');
  assert.equal(planTemplate('class', 5, 'verilog'), undefined);
  assert.equal(planTemplate('fork', 4, 'systemverilog')?.snippet, 'fork\n\t$0\n${1|join,join_any,join_none|}');
  assert.equal(planTemplate('fork', 4, 'verilog')?.snippet, 'fork\n\t$0\njoin');
  assert.equal(planTemplate('cla', 3, 'systemverilog', 'class')?.label, 'class');
  assert.equal(planTemplate('for', 3, 'systemverilog'), undefined);
});
test('class/fork templates never duplicate closers or disturb existing comments and macros', () => {
  for (const text of ['class\nendclass', 'fork\njoin', 'fork\njoin_any', 'fork\njoin_none', 'class // keep', 'fork /* keep */', '// class', '"fork', '`define BODY fork', 'class\n`ifdef X\n`endif', 'typedef class', 'virtual class', 'pkg::class', 'obj.fork']) {
    const offset = text.split('\n')[0].length;
    assert.equal(planTemplate(text, offset, 'systemverilog'), undefined, text);
  }
  // A comment before the expansion keeps its text; words in comments are not closers.
  const text = '// endclass 한글\n  class';
  const edit = planTemplate(text, text.length, 'systemverilog')!;
  assert.equal(text.slice(0, edit.start), '// endclass 한글\n  ');
  assert.equal(planTemplate('fork\n// join_any', 4, 'systemverilog')?.label, 'fork');
});
test('native indentation balances fork and class headers with existing closing rules', async () => {
  const config = JSON.parse(await readFile('packages/vscode/language-configuration.json', 'utf8'));
  const increase = new RegExp(config.indentationRules.increaseIndentPattern);
  const decrease = new RegExp(config.indentationRules.decreaseIndentPattern);
  for (const line of ['\tfork', 'fork : workers // concurrent', '  class Transaction;', 'virtual class Base; // base']) assert.ok(increase.test(line), line);
  for (const line of ['fork worker(); join', '// fork', 'typedef class Transaction;', 'obj.fork();']) assert.ok(!increase.test(line), line);
  for (const line of ['\tjoin', '\tjoin_any', '\tjoin_none', 'endclass']) assert.ok(decrease.test(line), line);
});

test('begin: body cursor, indentation and named blocks', () => {
  assert.equal(enter('initial begin|'), 'initial begin\n    |\nend');
  assert.equal(enter('    if (ready) begin : transfer|'), '    if (ready) begin : transfer\n        |\n    end');
  assert.equal(enter('\talways begin|', '\t', '\r\n'), '\talways begin\r\n\t\t|\r\n\tend');
  assert.equal(enter('begin // block description|'), 'begin // block description\n    |\nend');
});
test('case: nested expressions, multiline header and case variants', () => {
  for (const keyword of ['case', 'casex', 'casez']) assert.equal(enter(`  ${keyword} (foo(bar))|`), `  ${keyword} (foo(bar))\n      |\n  endcase`);
  assert.equal(enter('    unique case (\n        opcode\n    )|'), '    unique case (\n        opcode\n    )\n        |\n    endcase');
  assert.equal(enter('case (opcode) inside|'), 'case (opcode) inside\n    |\nendcase');
});
test('existing closers are reused without consuming an outer block closer', () => {
  assert.equal(enter('begin|\nend'), 'begin\n    |\nend');
  assert.equal(enter('case (x)|\n  1: y = 0;\nendcase'), 'case (x)\n    |\n  1: y = 0;\nendcase');
  assert.equal(enter('begin| end'), 'begin\n    |\nend');
  assert.equal(enter('initial begin\n    if (x) begin|\nend'), 'initial begin\n    if (x) begin\n        |\n    end\nend');
  assert.equal(enter('initial begin\n    if (x) begin|\n    end\nend'), 'initial begin\n    if (x) begin\n        |\n    end\nend');
});
test('no synthetic blocks in comments, strings, macros, escaped names or optional-block statements', () => {
  for (const source of ['// begin|', '/* begin|', 'begin /* // comment|', '$display("begin|', '\\begin|', '`define BODY begin|', 'if (ready)|', 'always @(posedge clk)|', 'for (i=0; i<8; i++)|', 'some_begin|', 'case (x|', 'begin| x = 1;', 'begin // before|after']) assert.equal(enter(source), undefined, source);
  assert.equal(enter('begin|\n`ifdef FEATURE\nend\n`endif'), undefined);
});
test('non-code masking retains offsets and recognizes escaped quotes', () => {
  const text = '/* 한글 */\r\n"a\\\"begin" // end\ninitial begin';
  const result = scanCode(text);
  assert.equal(result.code.length, text.length);
  assert.equal(result.code.indexOf('initial'), text.indexOf('initial'));
  assert.equal(result.context, 'code');
});
test('completion separates language keywords and preserves the system-task dollar prefix', () => {
  const sv = basicCompletions('log', 3, 'systemverilog');
  assert.ok(sv.items.some(i => i.label === 'logic'));
  assert.ok(sv.items.some(i => i.label === 'xor'));
  assert.equal(basicCompletions('log', 3, 'verilog').items.some(i => i.label === 'logic'), false);
  const system = basicCompletions('  $mon', 6, 'systemverilog');
  assert.equal(system.start, 2);
  assert.ok(system.items.some(i => i.label === '$monitor'));
  assert.ok(system.items.every(i => i.label.startsWith('$')));
});
test('completion is suppressed in non-code and semantic member locations', () => {
  for (const text of ['// mon', '/* mon', '"mon', '`define mon', '\\mon', 'pkg::', 'pkg::sym', 'instance.', 'instance.po']) assert.deepEqual(basicCompletions(text, text.length, 'systemverilog').items, [], text);
});
