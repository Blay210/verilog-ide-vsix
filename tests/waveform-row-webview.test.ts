import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';
import { parseVcd } from '@rtl-dev/waveform';

test('actual row events reorder groups without changing cursors or removing signals', async () => {
  const compiled=await build({entryPoints:['packages/vscode/src/webview/waveform.ts'],bundle:true,platform:'browser',format:'iife',write:false});
  const elements=new Map<string,any>(), windowListeners=new Map<string,any>();let stored:any, hit:any;
  const ctx=new Proxy({measureText:(text:string)=>({width:text.length*7})} as any,{get:(o,k)=>o[k]??(()=>{})});
  const create=(tagName='DIV'):any=>{
    const flags=new Set<string>();
    const value:any={tagName,value:'',checked:false,disabled:false,textContent:'',dataset:{},style:{},children:[],events:new Map<string,any>(),attrs:{},clientWidth:800,clientHeight:42,
      classList:{add(...names:string[]){names.forEach(n=>flags.add(n));},remove(...names:string[]){names.forEach(n=>flags.delete(n));},toggle(n:string,on:boolean){if(on)flags.add(n);else flags.delete(n);},contains:(n:string)=>flags.has(n)},
      setAttribute(n:string,v:string){this.attrs[n]=v;},addEventListener(n:string,f:any){this.events.set(n,f);},append(...values:any[]){values.forEach(v=>v.parentElement=this);this.children.push(...values);},replaceChildren(...values:any[]){this.children=values;},
      setPointerCapture(){},releasePointerCapture(){},hasPointerCapture:()=>true,closest(){return this;},
      getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:800,height:42}),focus(){},querySelector(selector:string){return this.children.find((c:any)=>selector==='canvas'?c.tagName==='CANVAS':c.className===selector.slice(1))??this.children.flatMap((c:any)=>c.children).find((c:any)=>c.className===selector.slice(1));}};
    return value;
  };
  const element=(id:string)=>{if(!elements.has(id))elements.set(id,create());return elements.get(id);};
  vm.runInNewContext(compiled.outputFiles[0].text,{
    acquireVsCodeApi:()=>({postMessage(){},getState:()=>undefined,setState:(v:any)=>{stored=v;}}),
    document:{body:create(),getElementById:element,createElement:(n:string)=>create(n.toUpperCase()),elementFromPoint:()=>hit,querySelectorAll:(selector:string)=>selector==='.trace'?element('trace-rows').children:[],querySelector:()=>undefined},
    window:{innerWidth:1200,devicePixelRatio:1,addEventListener:(n:string,f:any)=>windowListeners.set(n,f)},
    ResizeObserver:class{observe(){}},MutationObserver:class{observe(){}},getComputedStyle:()=>({getPropertyValue:()=>''}),setTimeout:()=>1,clearTimeout(){}
  });
  const metadata=parseVcd('$timescale 1ns $end $scope module tb $end $var wire 1 ! a $end $var wire 1 " b $end $var wire 1 # c $end $var wire 1 $ d $end $upscope $end $enddefinitions $end #0 0! 0" 0# 0$ #10 1! 1" 1# 1$');
  windowListeners.get('message')({data:{kind:'init',name:'wave.vcd',metadata,views:{},link:{state:'unavailable'}}});
  const labels=()=>element('trace-rows').children.map((r:any)=>r.children[0]);
  assert.ok(labels().every((l:any)=>l.draggable));
  assert.ok(labels().every((l:any)=>l.children.every((c:any)=>c.tagName!=='BUTTON')), 'No redundant remove/move buttons');
  const event=(extra={})=>({preventDefault(){},stopPropagation(){},ctrlKey:false,metaKey:false,shiftKey:false,clientY:40,...extra});
  labels()[0].events.get('click')(event());labels()[2].events.get('click')(event({ctrlKey:true}));
  assert.equal(labels()[0].attrs['aria-selected'],'true');assert.equal(labels()[2].attrs['aria-selected'],'true');
  const beforeCursor=stored.a;
  labels()[0].events.get('dragstart')(event({dataTransfer:{setData(){}}}));
  labels()[3].events.get('drop')(event());
  assert.deepEqual([...stored.paths],['tb.b','tb.d','tb.a','tb.c']);assert.equal(stored.a,beforeCursor);
  assert.equal(element('trace-rows').children.length,4);
  labels()[1].events.get('click')(event());labels()[3].events.get('click')(event({shiftKey:true}));
  assert.deepEqual(labels().map((l:any)=>l.attrs['aria-selected']),['false','true','true','true']);
  // Captured pointer path must work even when the native HTML drag is unavailable.
  const source=labels()[1]; hit=labels()[0];
  source.events.get('pointerdown')(event({button:0,pointerId:1,clientX:10,clientY:40}));
  source.events.get('pointermove')(event({pointerId:1,clientX:10,clientY:0}));
  source.events.get('pointerup')(event({pointerId:1,clientX:10,clientY:0}));
  assert.deepEqual([...stored.paths],['tb.d','tb.a','tb.c','tb.b']);assert.equal(stored.a,beforeCursor);
  const cancelled=labels()[0]; hit=labels()[3];
  cancelled.events.get('pointerdown')(event({button:0,pointerId:2,clientX:10,clientY:0}));
  cancelled.events.get('pointermove')(event({pointerId:2,clientX:10,clientY:40}));
  cancelled.events.get('pointercancel')(event({pointerId:2}));
  cancelled.events.get('pointerup')(event({pointerId:2,clientX:10,clientY:40}));
  assert.deepEqual([...stored.paths],['tb.d','tb.a','tb.c','tb.b']);
  const buses=parseVcd('$timescale 1ns $end $scope module tb $end $var wire 8 ! a [0:7] $end $var wire 1 " b $end $var wire 1 # c $end $var wire 1 $ d $end $upscope $end $enddefinitions $end #0 b10xz0011 ! 0" 0# 0$ #10 b11000011 !');
  // New dump paths differ for a; existing other rows survive, then select the bus.
  windowListeners.get('message')({data:{kind:'init',name:'bus.vcd',metadata:buses,views:{},link:{state:'unavailable'}}});
  const option=element('catalogue').children.find((l:any)=>l.children[0].attrs['aria-label']==='tb.a [0:7]');
  option.children[0].checked=true; option.children[0].events.get('change')();
  const parent=()=>element('trace-rows').children.find((r:any)=>r.dataset.id==='0');
  const toggle=()=>parent().children[0].children.find((c:any)=>c.className==='bus-toggle');
  const busCursor=stored.a; toggle().events.get('click')(event());
  assert.equal(element('trace-rows').children.filter((r:any)=>r.className==='trace bit-trace').length,8);
  assert.deepEqual([...stored.expanded],['tb.a [0:7]']);assert.equal(stored.paths.length,4);assert.equal(stored.a,busCursor);
  windowListeners.get('message')({data:{kind:'init',name:'bus.vcd',metadata:buses,views:{},link:{state:'unavailable'}}});
  assert.equal(toggle().attrs['aria-expanded'],'true');
  assert.equal(element('trace-rows').children.filter((r:any)=>r.className==='trace bit-trace').length,8);
  toggle().events.get('click')(event());
  assert.equal(element('trace-rows').children.length,4); assert.deepEqual([...stored.expanded],[]);
  toggle().events.get('click')(event());
  const selectedBus=element('catalogue').children.find((l:any)=>l.children[0].attrs['aria-label']==='tb.a [0:7]').children[0];
  selectedBus.checked=false; selectedBus.events.get('change')();
  assert.equal(element('trace-rows').children.length,3);assert.deepEqual([...stored.expanded],[]);
  const wide=parseVcd('$scope module tb $end $var wire 128 ! a [127:0] $end $var wire 8 " b [7:0] $end $upscope $end $enddefinitions $end #0 b0 ! b0 "');
  windowListeners.get('message')({data:{kind:'init',name:'wide.vcd',metadata:wide,views:{},link:{state:'unavailable'}}});
  for(const option of element('catalogue').children) {option.children[0].checked=true;option.children[0].events.get('change')();}
  const toggles=()=>element('trace-rows').children.filter((r:any)=>r.dataset.id!==undefined).map((r:any)=>r.children[0].children.find((c:any)=>c.className==='bus-toggle'));
  toggles()[0].events.get('click')(event()); toggles()[1].events.get('click')(event());
  assert.equal(element('trace-rows').children.length,130);assert.equal(stored.expanded.length,1);
  assert.match(element('status').textContent,/128/);
});
