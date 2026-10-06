import test from 'node:test';
import assert from 'node:assert/strict';
import {parseVcd,mapTracePorts,valueAt,type TraceNode} from '@rtl-dev/waveform';
const port=(name:string,width=4)=>({name,signalType:{width,simpleIntegral:true}});
const node=(id:string,parts:string[],ports=[port('a')]):TraceNode=>({id,kind:'instance',instancePath:parts,ports,children:[]});
function data(wrapper=true){return parseVcd('$timescale 1ns $end '+(wrapper?'$scope module TOP $end ':'')+'$scope module tb $end $scope module left $end $var wire 4 ! a [3:0] $end $var wire 4 ! alias [3:0] $end $upscope $end $scope module right $end $var wire 4 % a [3:0] $end $upscope $end $scope module g[0] $end $scope module u $end $var wire 4 & a [3:0] $end $upscope $end $upscope $end $scope module \\escaped.name $end $var wire 4 / a [3:0] $end $upscope $end $upscope $end '+(wrapper?'$upscope $end ':'')+'$enddefinitions $end #0 b0001 ! b0010 % bxxxx & bzzzz / #5 b0011 ! b0110 %');}
const root:TraceNode={...node('tb',['tb'],[]),module:'tb',children:[node('tb.left',['tb','left'],[port('a'),port('alias'),port('absent')]),node('tb.right',['tb','right']),node('tb.g[0].u',['tb','g[0]','u']),node('tb.escaped.name',['tb','escaped.name'])]};
test('exact segmented paths handle TOP, duplicate modules, aliases, generate and escaped dots',()=>{
  for(const wrapper of [true,false]){
    const trace=data(wrapper),bindings=mapTracePorts({roots:[root]},trace.signals,'tb');
    const a=bindings.find(b=>b.instanceId==='tb.left'&&b.port==='a')!,alias=bindings.find(b=>b.port==='alias')!,b=bindings.find(b=>b.instanceId==='tb.right')!;
    assert.equal(a.state,'matched');assert.equal(alias.code,a.code);assert.equal(b.state,'matched');assert.notEqual(a.code,b.code);
    assert.equal(valueAt(trace.channels.get(a.code!)!,5n),'0011');assert.equal(valueAt(trace.channels.get(b.code!)!,5n),'0110');
    assert.equal(bindings.find(b=>b.port==='absent')!.state,'missing');
    assert.equal(valueAt(trace.channels.get(bindings.find(b=>b.instanceId==='tb.g[0].u')!.code!)!,0n),'xxxx');
    assert.equal(valueAt(trace.channels.get(bindings.find(b=>b.instanceId==='tb.escaped.name')!.code!)!,0n),'zzzz');
  }
});
test('width mismatch, duplicate channels/roots and missing semantic metadata never guess a binding',()=>{
  const trace=data(),width={...root,children:[node('wrong',['tb','left'],[port('a',8)])]};
  assert.equal(mapTracePorts({roots:[width]},trace.signals,'tb')[0].state,'width-mismatch');
  const signal=trace.signals[0],duplicate={...signal,id:'extra',code:'other'};
  assert.equal(mapTracePorts({roots:[root]},[...trace.signals,duplicate],'tb')[0].state,'ambiguous');
  const bare={...signal,id:'bare',scopeSegments:['tb','left']};
  assert.ok(mapTracePorts({roots:[root]},[...trace.signals,bare],'tb').every(b=>b.state==='ambiguous'));
  const legacy={...root,children:[{...node('legacy',['tb','left']),instancePath:undefined}]};
  assert.equal(mapTracePorts({roots:[legacy]},trace.signals,'tb')[0].state,'unsupported');
  assert.equal(mapTracePorts({roots:[root]},trace.signals.map(s=>({...s,scopeSegments:undefined,reference:undefined})),'tb')[0].state,'missing');
  assert.throws(()=>mapTracePorts({roots:[root,root]},data().signals,'tb'),/one selected/);
});


test('escaped dot and nested scopes with the same display path retain different channels',()=>{
  const trace=data(),flat=trace.signals.find(signal=>signal.scopeSegments?.at(-1)==='\\escaped.name')!;
  const nested={...flat,id:'nested',code:'nested-code',scopeSegments:['TOP','tb','escaped','name']};
  const design={...root,children:[node('flat',['tb','escaped.name']),node('nested',['tb','escaped','name'])]};
  const bindings=mapTracePorts({roots:[design]},[flat,nested],'tb');
  assert.equal(bindings[0].state,'matched');assert.equal(bindings[1].state,'matched');assert.notEqual(bindings[0].code,bindings[1].code);
  const duplicate={...root,children:[node('one',['tb','left']),node('two',['tb','left'])]};
  assert.ok(mapTracePorts({roots:[duplicate]},trace.signals,'tb').every(binding=>binding.state==='ambiguous'));
});
