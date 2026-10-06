import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVcd, queryWindow, queryValues } from '../packages/waveform/src/index';
import { WindowReuse } from '../packages/vscode/src/webview/window-reuse';

test('single viewport reuse matches fresh windows at large ticks, aliases and X/Z, without mutating its source', () => {
  const origin = 9007199254740993n;
  const data = parseVcd('$timescale 1ps $end $scope module top $end $var wire 8 ! bus $end $var wire 8 ! alias $end $upscope $end $enddefinitions $end '+Array.from({length:100},(_,i)=>`#${origin+BigInt(i)} b${i%17===0?'xxxxxxxx':i%17===1?'zzzzzzzz':i.toString(2).padStart(8,'0')} !`).join(' '));
  const request = { signals: ['0','1'], from:String(origin),to:String(origin+99n),cursor:String(origin),pixels:2 };
  const reuse = new WindowReuse(), source=queryWindow(data,request), snapshot=JSON.stringify(source);
  reuse.remember(request,source);
  for(const step of [1,3,17,18,50,99]) {
    const r={...request,cursor:String(origin+BigInt(step))};
    assert.deepEqual(reuse.merge(r,queryValues(data,{signals:r.signals,cursor:r.cursor})),queryWindow(data,r));
  }
  assert.equal(JSON.stringify(source),snapshot);
  for(const change of [{pixels:3},{signals:['1','0']},{signals:['0']},{from:String(origin+1n)},{to:String(origin+98n)}])assert.equal(reuse.matches({...request,...change}),false);
  assert.equal(reuse.merge(request,{cursor:'0',rows:[]}),undefined);
  reuse.clear(); assert.equal(reuse.matches(request),false);
  reuse.remember(request,{...source,rows:[...source.rows].reverse()}); assert.equal(reuse.matches(request),false);
});

test('sparse real, wide buses, empty selection and zero-end traces retain exact fresh-query behavior', () => {
  for (const text of [
    '$var real 1 ! voltage $end $var wire 128 " wide $end $enddefinitions $end #0 r1.25 ! b1 " #5 r-2.5 ! bzz " #10 r3.0 ! bxx "',
    '$var wire 1 ! clk $end $enddefinitions $end #0 1!'
  ]) {
    const data = parseVcd(text), reuse = new WindowReuse();
    for (const signals of [data.signals.map(s => s.id), []]) {
      const r = {signals,from:'0',to:String(BigInt(data.end) || 1n),cursor:'0',pixels:1600};
      reuse.remember(r,queryWindow(data,r));
      for (const cursor of ['0',data.end]) {
        const next={...r,cursor}; assert.deepEqual(reuse.merge(next,queryValues(data,{signals,cursor})),queryWindow(data,next));
      }
      const wrong=queryValues(data,{signals,cursor:'0'});
      if (signals.length>1) assert.equal(reuse.merge(r,{...wrong,rows:[...wrong.rows].reverse()}),undefined);
    }
  }
});
