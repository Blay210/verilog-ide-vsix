import test from 'node:test';
import assert from 'node:assert/strict';
import { busBits, bitValue, bitRow, parseVcd, parseViewBook, putView, retainMissing, type WaveSignal } from '@rtl-dev/waveform';
const bus: WaveSignal = { id:'0',code:'!',name:'data',path:'tb.data',scope:'tb',width:8,type:'wire',range:'[7:0]' };
test('bit labels respect declaration direction, nonzero and negative ranges without inventing missing indexes', () => {
  assert.deepEqual(busBits(bus).map(b=>b.label),['[7]','[6]','[5]','[4]','[3]','[2]','[1]','[0]']);
  assert.deepEqual(busBits({...bus,width:3,range:'[2:4]'}),[{offset:2,label:'[2]'},{offset:1,label:'[3]'},{offset:0,label:'[4]'}]);
  assert.deepEqual(busBits({...bus,width:2,range:'[-1:-2]'}).map(b=>b.label),['[-1]','[-2]']);
  for(const range of [undefined,'[1:0]','[1:0] [3:0]']) assert.equal(busBits({...bus,range})[0].label,'bit offset 7');
  assert.equal(busBits({...bus,width:129}).length,0); assert.equal(busBits({...bus,type:'real'}).length,0);
});
test('bit projection preserves X/Z, exact timestamps and removes unrelated bus transitions', () => {
  assert.equal(bitValue('10xz',4,1),'x');assert.equal(bitValue('10xz',4,0),'z');
  assert.equal(bitValue('z',8,7),'z');assert.equal(bitValue('1',8,7),'0');
  const row={id:'0',initial:'0000',value:'x001',dense:false,changes:[{time:'9007199254740993',value:'0001'},{time:'9007199254740994',value:'0011'},{time:'9007199254740995',value:'x001'}]};
  assert.deepEqual(bitRow(row,4,0).changes,[{time:'9007199254740993',value:'1'}]);
  assert.equal(bitRow(row,4,3).value,'x');assert.deepEqual(bitRow(row,4,3).changes,[{time:'9007199254740995',value:'x'}]);
  const dense=bitRow({...row,dense:true,buckets:[{from:'0',to:'10',edges:20,value:'0001'}]},4,0);
  assert.equal(dense.dense,true);assert.equal(dense.buckets![0].edges,20,'Parent activity remains uncertain for individual bits');
});
test('expanded buses persist through saved views and missing runs while legacy views remain readable', () => {
  const view={id:'bus',name:'Bus',radix:'hex' as const,signals:[{path:bus.path,expanded:true}]};
  const book=putView(parseViewBook(undefined),view);
  assert.equal(parseViewBook(JSON.parse(JSON.stringify(book))).views[0].signals[0].expanded,true);
  assert.equal(retainMissing([],book.views[0],[])[0].expanded,true);
  assert.equal(putView(parseViewBook(undefined),{...view,signals:[{path:bus.path}]}).views[0].signals[0].expanded,undefined);
  assert.throws(()=>putView(book,{...view,signals:[{path:bus.path,expanded:'yes' as any}]}));
  const dump=parseVcd('$scope module tb $end $var wire 3 ! data [2:4] $end $upscope $end $enddefinitions $end #0 b101 !');
  assert.deepEqual(busBits(dump.signals[0]).map(b=>b.label),['[2]','[3]','[4]']);
});
