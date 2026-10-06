import test from 'node:test';
import assert from 'node:assert/strict';
import { planClosingLabel } from '../packages/language/src/labels';

test('optional labels preserve nested blocks, comments and one insertion reversal', () => {
  const text = 'module top;\r\n\tinitial begin : outer\r\n begin : inner\r\n end // preserve 한글\r\n\tend\r\nendmodule';
  for (const [word, closer] of [['inner','end'], ['outer','end'], ['top','endmodule']]) {
    const edit = planClosingLabel(text, text.indexOf(word))!;
    assert.equal(edit.name, word); assert.equal(edit.closer, closer);
    const result = text.slice(0,edit.offset) + edit.text + text.slice(edit.offset);
    assert.ok(result.includes('// preserve 한글')); assert.ok(result.includes('\r\n\t'));
    assert.equal(result.slice(0,edit.offset) + result.slice(edit.offset + edit.text.length), text);
  }
  assert.equal(planClosingLabel(text, text.indexOf('end //'))?.name, 'inner');
});
test('declaration labels support lifetime and trivia without semantic rename', () => {
  for (const word of ['module','package','interface','program']) {
    const text = `${word} /* name */ automatic thing; end${word} // trailing`;
    const edit = planClosingLabel(text, 0)!;
    assert.equal(text.slice(0,edit.offset) + edit.text + text.slice(edit.offset), `${word} /* name */ automatic thing; end${word} : thing // trailing`);
    assert.equal(planClosingLabel(`${word} thing; end${word} : existing`, 0), undefined);
  }
});
test('ambiguous or incomplete structures never acquire guessed labels', () => {
  for (const text of ['module top; initial begin : b endmodule', 'module top; end', 'module top;', '`ifdef X\nmodule top; endmodule\n`endif', 'module `NAME; endmodule', 'module \\escaped ; endmodule', 'module top; initial begin end endmodule']) {
    const offset = text.includes('begin') ? text.indexOf('begin') : text.indexOf('module');
    assert.equal(planClosingLabel(text, offset), undefined, text);
  }
  const text = 'module top; initial begin : b end : wrong endmodule';
  assert.equal(planClosingLabel(text, text.indexOf('begin')), undefined);
});
test('comments, strings and unsupported blocks do not create actions or steal closers', () => {
  const text = 'module top; // begin : fake end\n initial begin : real $display("end `macro"); fork begin end join_any end endmodule';
  assert.equal(planClosingLabel(text, text.indexOf('fake')), undefined);
  assert.equal(planClosingLabel(text, text.indexOf('"end')+2), undefined);
  assert.equal(planClosingLabel(text, text.indexOf('real'))?.name, 'real');
  assert.equal(planClosingLabel(text, text.indexOf('fork')), undefined);
  assert.equal(planClosingLabel(text, 0)?.name, 'top');
});
