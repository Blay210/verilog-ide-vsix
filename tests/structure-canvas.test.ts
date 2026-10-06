import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { structureCanvasScript } from '../packages/vscode/src/structure-canvas';

function runtime(options:{key?:string;state?:any;width?:number;height?:number;sceneHeight?:number}={}) {
  const listeners=new Map<string,Array<(event:any)=>void>>(),buttons=new Map<string,()=>void>(),captures=new Set<number>();
  let resize!:()=>void, state=options.state??{}, rect={left:80,top:40,width:options.width??800,height:options.height??500},transform='';
  const label={textContent:''};
  const canvas={dataset:{sceneWidth:'980',sceneHeight:String(options.sceneHeight??300),viewKey:options.key??'one',zoom:''},
    addEventListener:(kind:string,fn:any)=>listeners.set(kind,[...(listeners.get(kind)??[]),fn]),
    setAttribute(){},getBoundingClientRect:()=>rect,setPointerCapture:(id:number)=>captures.add(id),hasPointerCapture:(id:number)=>captures.has(id),releasePointerCapture:(id:number)=>captures.delete(id),focus(){},classList:{add(){},remove(){}}};
  const scene={setAttribute:(_name:string,value:string)=>{transform=value;}};
  vm.runInNewContext(structureCanvasScript,{vscode:{getState:()=>state,setState:(value:any)=>{state=structuredClone(value);}},
    document:{getElementById:(id:string)=>id==='structure-canvas'?canvas:id==='structure-scene'?scene:label,
      querySelectorAll:()=>['fit','in','out'].map(camera=>({dataset:{camera},addEventListener:(_kind:string,fn:()=>void)=>buttons.set(camera,fn)}))},
    ResizeObserver:class{constructor(fn:()=>void){resize=fn;}observe(){}}});
  const fire=(kind:string,extra:any={})=>{const event={type:kind,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},prevented:false,stopped:false,target:canvas,button:0,pointerId:1,clientX:200,clientY:150,isPrimary:true,...extra};
    if(!event.target.closest)event.target.closest=()=>null;listeners.get(kind)?.forEach(fn=>fn(event));return event;};
  return {canvas,label,buttons,fire,captures,get camera(){return state.structureCameras[options.key??'one'];},get state(){return state;},get transform(){return transform;},resize:(width:number,height:number)=>{rect={...rect,width,height};resize();}};
}

test('camera fits bounds, wheel zoom keeps the pointed world position and controls recover full view',()=>{
  const ui=runtime(),before=ui.camera;
  assert.ok(before.x>=19&&before.y>=19);assert.ok(before.x+980*before.scale<=781);assert.ok(before.y+300*before.scale<=481);
  const point={x:200-80,y:150-40},world={x:(point.x-before.x)/before.scale,y:(point.y-before.y)/before.scale};
  assert.equal(ui.fire('wheel',{deltaY:-100,deltaMode:0}).prevented,true);
  const after=ui.camera;assert.ok(after.scale>before.scale);
  assert.ok(Math.abs((point.x-after.x)/after.scale-world.x)<1e-8);assert.ok(Math.abs((point.y-after.y)/after.scale-world.y)<1e-8);
  ui.buttons.get('out')!();ui.buttons.get('in')!();ui.buttons.get('fit')!();assert.equal(ui.camera.scale,before.scale);
  for(let i=0;i<50;i++)ui.fire('wheel',{deltaY:-1000,deltaMode:1});assert.equal(ui.camera.scale,8);
  for(let i=0;i<100;i++)ui.fire('wheel',{deltaY:1000,deltaMode:2});assert.equal(ui.camera.scale,.01);
  assert.match(ui.transform,/translate.*scale/);
});

test('background pan uses capture, ignores other pointers and preserves module and source interactions',()=>{
  const ui=runtime(),before=ui.camera;
  const card={closest:()=>({dataset:{node:'child'}})};
  ui.fire('pointerdown',{target:card});assert.equal(ui.captures.size,0);
  ui.fire('pointerdown');assert.equal(ui.captures.size,1);
  ui.fire('pointermove',{pointerId:2,clientX:500});assert.equal(ui.camera.x,before.x);
  ui.fire('pointermove',{clientX:250,clientY:180});assert.equal(ui.camera.x,before.x+50);assert.equal(ui.camera.y,before.y+30);
  ui.fire('pointerup');assert.equal(ui.captures.size,0);assert.equal(ui.fire('click').stopped,true,'Pan must not navigate');
  ui.fire('pointerdown',{target:card});assert.equal(ui.fire('dblclick',{target:card}).stopped,false,'Next deliberate drill-down works');
  ui.fire('pointerdown',{button:1,target:card});ui.fire('pointermove',{clientX:270});ui.fire('pointercancel');assert.equal(ui.captures.size,0);
});

test('camera survives scope return, isolates contexts, bounds storage and follows resized viewport',()=>{
  const ui=runtime();ui.buttons.get('in')!();ui.fire('keydown',{key:'ArrowRight'});
  const saved=ui.camera; const reopened=runtime({state:ui.state});assert.equal(reopened.camera.x,saved.x);assert.equal(reopened.camera.scale,saved.scale);
  reopened.resize(1000,600);assert.equal(reopened.camera.x,saved.x+100);assert.equal(reopened.camera.y,saved.y+50);
  const isolated=runtime({state:ui.state,key:'different-run'});assert.equal(isolated.camera.fitted,true);assert.equal(isolated.state.structureCameras.one.scale,saved.scale);
  const resized=runtime({state:ui.state,width:1000,height:600});assert.equal(resized.camera.x,saved.x+100);
  const changed=runtime({state:ui.state,sceneHeight:1000});assert.equal(changed.camera.fitted,true);
  const corrupt=runtime({state:{structureCameras:{one:{x:NaN,y:0,scale:Infinity}}}});assert.equal(corrupt.camera.fitted,true);
  let state:any={};for(let i=0;i<40;i++)state=runtime({state,key:String(i)}).state;assert.equal(Object.keys(state.structureCameras).length,32);
  const fit=runtime();fit.resize(1000,600);assert.equal(fit.camera.fitted,true);assert.equal(fit.camera.scale,960/980);
});

test('camera keyboard shortcuts apply only to focused canvas, leaving child navigation intact',()=>{
  const ui=runtime(),scale=ui.camera.scale;
  assert.equal(ui.fire('keydown',{key:'+',target:{closest:()=>({})}}).prevented,false);assert.equal(ui.camera.scale,scale);
  assert.equal(ui.fire('keydown',{key:'+',ctrlKey:true}).prevented,false);
  assert.equal(ui.fire('keydown',{key:'+'}).prevented,true);assert.ok(ui.camera.scale>scale);
  ui.fire('keydown',{key:'0'});assert.equal(ui.camera.scale,scale);
});
