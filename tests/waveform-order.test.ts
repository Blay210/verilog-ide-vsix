import test from 'node:test';
import assert from 'node:assert/strict';
import { selectRows, moveRows } from '../packages/vscode/src/webview/waveform-order';

test('signal row selection supports Ctrl toggling and Shift ranges in display order', () => {
  const order=['a','b','c','d','e'];
  assert.deepEqual(selectRows(order,[] ,undefined,'b',false,false),{ids:['b'],anchor:'b'});
  assert.deepEqual(selectRows(order,['b'],'b','d',true,false),{ids:['b','d'],anchor:'d'});
  assert.deepEqual(selectRows(order,['b','d'],'d','b',true,false),{ids:['d'],anchor:'b'});
  assert.deepEqual(selectRows(order,['b'],'b','e',false,true),{ids:['b','c','d','e'],anchor:'b'});
  assert.deepEqual(selectRows(order,['e'],'d','b',true,true),{ids:['b','c','d','e'],anchor:'d'});
});
test('dragging a group preserves displayed order, handles both ends and ignores self drops', () => {
  const order=['a','b','c','d','e'];
  assert.deepEqual(moveRows(order,['d','b'],'e',true),['a','c','e','b','d']);
  assert.deepEqual(moveRows(order,['b','d'],'a',false),['b','d','a','c','e']);
  assert.deepEqual(moveRows(order,['b','d'],'d',false),order);
  assert.deepEqual(moveRows(order,['gone'],'e',true),order);
  assert.deepEqual(moveRows(order,['b'],'gone',true),order);
});
