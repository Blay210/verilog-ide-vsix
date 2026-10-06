import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import type {HierarchyNode} from '@rtl-dev/semantic';
import { parseVcd } from '@rtl-dev/waveform';

const point={file:'D:/fixture/design.sv',offset:0,line:0,character:0};
const node=(id:string,children:HierarchyNode[]=[]):HierarchyNode=>({id,name:id,kind:'instance',module:'unit',location:point,definition:point,parameters:[],ports:[],children});
const graph=[node('top',[node('top.dut',[node('top.dut.leaf')]),node('top.other')])];
const compiled=build({entryPoints:['packages/vscode/src/structure.ts'],bundle:true,platform:'node',format:'cjs',write:false,external:['vscode','@rtl-dev/core','@rtl-dev/semantic','@rtl-dev/toolchain']});
const disposable=()=>({dispose(){}});

async function harness(provider?: (test:string,signal:AbortSignal)=>Promise<{roots:HierarchyNode[];diagnostics:unknown[]}>, traces?: any) {
  const commands=new Map<string, (...args:any[])=>Promise<any>>(), flags=new Map<string,boolean>(), errors:string[]=[], opened:string[]=[];
  let changed!: (event:any)=>void, receive!: (message:any)=>Promise<void>, close!:()=>void;
  let html=''; const posts:any[]=[];
  const archives = new Map<string,any>();
  const observed: {project:any; overlays:any[]}[] = [];
  const recordedOpened: any[][] = [];
  const uri=(fsPath:string)=>({fsPath,scheme:'file'});
  const vscode={
    EventEmitter:class {event=()=>disposable();fire(){}dispose(){}},
    TreeItem:class {constructor(public label:string,public state:number){}},ThemeIcon:class{},
    TreeItemCollapsibleState:{Collapsed:1,None:0},ViewColumn:{Beside:2},ProgressLocation:{Notification:1},
    Uri:{file:uri},Position:class{},Range:class{},
    workspace:{isTrusted:true,textDocuments:[] as any[],workspaceFolders:[{uri:uri('D:/fixture')}],
      createFileSystemWatcher:()=>({onDidCreate:disposable,onDidChange:disposable,onDidDelete:disposable,dispose(){}}),
      onDidChangeTextDocument:(listener:typeof changed)=>{changed=listener;return disposable();},
      onDidCloseTextDocument:disposable,onDidChangeWorkspaceFolders:disposable},
    window:{createTreeView:()=>({...disposable(),reveal:async()=>{}}),showErrorMessage:async(message:string)=>{errors.push(message);},
      showTextDocument:async(uri:{fsPath:string})=>{opened.push(uri.fsPath);},
      createWebviewPanel:()=>({webview:{get html(){return html;},set html(value:string){html=value;},postMessage:async(message:any)=>{posts.push(message);return true;},onDidReceiveMessage:(listener:typeof receive)=>{receive=listener;return disposable();}},onDidDispose:(listener:()=>void)=>{close=listener;return disposable();},reveal(){},dispose(){close();}}),
      withProgress:async(_options:any,task:any)=>task({}, {onCancellationRequested:disposable})},
    commands:{registerCommand:(id:string,callback:any)=>{commands.set(id,callback);return disposable();},executeCommand:async(id:string,...args:any[])=>{
      if(id==='rtl.openRecordedSource'){recordedOpened.push(args);return 'rtl-recorded:source';}
      if(id==='setContext'){flags.set(args[0],args[1]);return;}
      return commands.get(id)?.(...args);
    }}
  };
  const require=createRequire(import.meta.url),module={exports:{} as {registerStructure(ctx:any,traces?:any):void}};
  const mocks:Record<string,unknown>={vscode,
    '@rtl-dev/core':{loadRecordedInputs:async(result:any)=>{const value=archives.get(result.runId);if(!value)throw Error('Recorded inputs damaged');return value;},loadProject:async(root:string)=>({root,name:'fixture',tests:[{name:'first',top:'top'},{name:'second',top:'top'}]})},
    '@rtl-dev/toolchain':{detectSemanticRuntime:async()=> 'python',toolsHome:()=> 'D:/tools'},
    '@rtl-dev/semantic':{SlangProvider:class {hierarchy(project:any,test:string,overlays:any[],signal:AbortSignal){observed.push({project,overlays});return provider?provider(test,signal):Promise.resolve({roots:graph,diagnostics:[]});}}}
  };
  vm.runInNewContext((await compiled).outputFiles[0].text,{module,exports:module.exports,require:(id:string)=>mocks[id]??require(id),process,AbortController});
  module.exports.registerStructure({subscriptions:[],asAbsolutePath:(path:string)=>path},traces);
  const run=(id:string,...args:any[])=>commands.get(id)!(...args);
  return {run,state:()=>run('rtl.getStructure'),html:()=>html,posts,flags,errors,opened,archives,observed,recordedOpened,documents:vscode.workspace.textDocuments,
    change:(file='D:/fixture/design.sv')=>changed({document:{uri:uri(file)}}),close:()=>close(),
    message:(action:string,id?:string,snapshot?:string)=>receive({action,id,snapshot:snapshot??html.match(/snapshot:'([a-f0-9]+)'/)![1]})};
}

test('structure host validates snapshot/visible targets and projects Back/Forward/Up readiness',async()=>{
  const h=await harness();await h.run('rtl.showStructure','first');
  assert.equal((await h.state()).inspected,'top');
  await h.message('node','top.dut.leaf');assert.equal((await h.state()).inspected,'top');
  const old=h.html().match(/snapshot:'([a-f0-9]+)'/)![1];
  await h.message('node','top.dut');assert.equal((await h.state()).inspected,'top.dut');
  assert.equal(h.flags.get('rtl.structureCanBack'),true);
  await h.message('node','top.other',old);assert.equal((await h.state()).inspected,'top.dut');
  await h.message('node','top.dut.leaf');assert.equal((await h.state()).inspected,'top.dut.leaf');
  await h.message('up');assert.equal((await h.state()).inspected,'top.dut');
  await h.message('back');assert.equal((await h.state()).inspected,'top.dut.leaf');
  await h.message('forward');assert.equal((await h.state()).inspected,'top.dut');
  await h.message('source','foreign');assert.deepEqual(h.opened,[]);
  await h.run('rtl.openStructureDefinition','top.dut');assert.deepEqual(h.opened,[point.file]);
  h.change();assert.equal(h.flags.get('rtl.structureCanBack'),false);
  const previous=(await h.state()).inspected;
  await h.run('rtl.structureBack');await h.message('node','top.other');
  assert.equal((await h.state()).inspected,previous);assert.match(h.errors.at(-1)!,/Refresh/);
  await h.run('rtl.refreshStructure');assert.equal((await h.state()).inspected,previous);
  await h.run('rtl.showStructure','second');assert.equal((await h.state()).inspected,'top');
  assert.equal((await h.state()).context.test,'second');assert.equal(h.flags.get('rtl.structureCanBack'),false);
  const closedSnapshot=h.html().match(/snapshot:'([a-f0-9]+)'/)![1];h.close();
  await h.message('node','top.dut',closedSnapshot);assert.equal((await h.state()).inspected,'top');
  await h.run('rtl.inspectStructure','top.dut');assert.notEqual(h.html().match(/snapshot:'([a-f0-9]+)'/)![1],closedSnapshot);
});

test('an older asynchronous context result cannot replace the newer hierarchy or navigation',async()=>{
  let finish!:()=>void, entered!:()=>void;
  const started=new Promise<void>(resolve=>{entered=resolve;});
  const gate=new Promise<void>(resolve=>{finish=resolve;});
  const h=await harness(async(test)=>{if(test==='first'){entered();await gate;}return {roots:graph,diagnostics:[]};});
  const first=h.run('rtl.showStructure','first');await started;
  await h.run('rtl.showStructure','second');await h.run('rtl.inspectStructure','top.dut');
  finish();await first;
  const state=await h.state();assert.equal(state.selected.test,'second');assert.equal(state.context.test,'second');assert.equal(state.inspected,'top.dut');
});

test('recorded structure pins run inputs, resets run history, ignores current edits and blocks damaged archives', async () => {
  const h = await harness();
  const run = (id: string) => ({ runId: id, name: 'first', top: 'top', directory: `D:/fixture/.rtl/runs/${id}`, inputSnapshot: { version: 1, state: 'ready' } });
  for (const id of ['a','b']) h.archives.set(id, { runId: id, project: { root: `D:/fixture/.rtl/runs/${id}/inputs`, name:'fixture', tests:[{name:'first',top:'top'}] } });
  h.documents.push({ isDirty:true, uri:{scheme:'file',fsPath:'D:/fixture/design.sv'}, getText:()=> 'invalid current edits' });
  await h.run('rtl.showRecordedStructure', run('a'));
  assert.equal((await h.state()).context.mode, 'recorded');
  assert.equal((await h.state()).context.runId, 'a');
  assert.equal(h.observed.at(-1)!.overlays.length, 0);
  assert.match(h.observed.at(-1)!.project.root, /runs\/a\/inputs/);
  assert.match(h.html(), /Recorded run/); assert.match(h.html(), /Explore current design/);
  await h.run('rtl.inspectStructure', 'top.dut');
  h.change(); assert.equal((await h.state()).stale, false);
  await h.run('rtl.openStructureDefinition', 'top.dut');
  assert.equal(h.recordedOpened.at(-1)![0].runId, 'a'); assert.equal(h.opened.length, 0);
  await h.run('rtl.showRecordedStructure', run('b'));
  assert.equal((await h.state()).inspected, 'top'); assert.equal(h.flags.get('rtl.structureCanBack'), false);
  h.archives.delete('b'); h.change('D:/fixture/.rtl/runs/b/inputs/design.sv');
  assert.equal((await h.state()).stale, true);
  await h.run('rtl.refreshStructure'); assert.equal((await h.state()).stale, true);
  await h.run('rtl.openStructureDefinition', 'top'); assert.equal(h.recordedOpened.length, 1);
  await h.run('rtl.showStructure', 'first'); assert.equal((await h.state()).context.mode, 'current');
  assert.equal(h.observed.at(-1)!.overlays.length, 1);
});


test('recorded values reject old cursor/run/page replies and obsolete time controls', async () => {
  const leaf:HierarchyNode={...node('top.dut'),instancePath:['top','dut'],ports:[{name:'clk',direction:'input',type:'logic',location:point,signalType:{text:'logic',simpleIntegral:true,width:1},connection:{kind:'expression',text:'clk',references:[]}}]};
  const root:HierarchyNode={...node('top',[leaf]),module:'top',instancePath:['top']};
  const metadata=parseVcd('$timescale 1 ps $end $scope module top $end $scope module dut $end $var wire 1 ! clk $end $upscope $end $upscope $end $enddefinitions $end #0 0! #10 1!');
  const handles:any[]=[];let defer=false;const pending:{request:any;resolve:(value:any)=>void}[]=[];
  const traces={changed(){},async open(result:any){
    let state={state:'ready',time:'0',revision:0},closed=false;const listeners=new Set<()=>void>();
    const handle={result,metadata,read:()=>({...state}),subscribe:(f:()=>void)=>{listeners.add(f);return disposable();},
      set(time:string){if(closed||state.state!=='ready')throw Error('Unavailable');state={state:'ready',time,revision:state.revision+1};listeners.forEach(f=>f());},
      values(request:any){const value={cursor:request.cursor,rows:[{id:'0',value:request.cursor==='0'?'0':'1'}]};return defer?new Promise(resolve=>pending.push({request,resolve})):Promise.resolve(value);},
      invalidate(){state={...state,state:'unavailable',revision:state.revision+1};listeners.forEach(f=>f());},dispose(){closed=true;listeners.clear();}};
    handles.push(handle);return handle;
  }};
  const h=await harness(async()=>({roots:[root],diagnostics:[]}),traces);
  const result=(runId:string)=>({runId,name:'first',top:'top',directory:`D:/fixture/.rtl/runs/${runId}`});
  for(const runId of ['a','b'])h.archives.set(runId,{runId,project:{root:'D:/fixture',name:'fixture',tests:[{name:'first',top:'top'}]}});
  await h.run('rtl.showRecordedStructure',result('a'));assert.equal((await h.state()).trace.values['0'].text,'0');
  const oldPage=h.html().match(/snapshot:'([a-f0-9]+)'/)![1];
  defer=true;const first=h.run('rtl.setStructureTime','10');await Promise.resolve();
  const second=h.run('rtl.setStructureTime','0');await Promise.resolve();
  // Callback and awaited command both query; finish newest requests first.
  for(const job of pending.filter(j=>j.request.cursor==='0'))job.resolve({cursor:'0',rows:[{id:'0',value:'0'}]});
  await second;
  for(const job of pending.filter(j=>j.request.cursor==='10'))job.resolve({cursor:'10',rows:[{id:'0',value:'1'}]});
  await first;assert.equal((await h.state()).trace.values['0'].text,'0');
  const old=h.run('rtl.setStructureTime','10');await Promise.resolve();
  defer=false;await h.run('rtl.showRecordedStructure',result('b'));
  for(const job of pending)job.resolve({cursor:job.request.cursor,rows:[{id:'0',value:'1'}]});await old;
  assert.equal((await h.state()).trace.runId,'b');assert.equal((await h.state()).trace.values['0'].text,'0');
  await h.message('traceTime','10 ps',oldPage);assert.equal(handles.at(-1).read().time,'0');
  handles.at(-1).invalidate();await Promise.resolve();assert.equal((await h.state()).trace.values['0'].text,'Unavailable');
  await h.run('rtl.showStructure','first');assert.equal((await h.state()).trace,undefined);
});

test('closing the structure during refresh cancels work without reopening the panel',async()=>{
  let calls=0,release!:()=>void,started!:()=>void,captured:AbortSignal|undefined;
  const gate=new Promise<void>(r=>{release=r;}),entered=new Promise<void>(r=>{started=r;});
  const h=await harness(async(_test,signal)=>{if(++calls===2){captured=signal;started();await gate;signal.throwIfAborted();}return {roots:graph,diagnostics:[]};});
  await h.run('rtl.showStructure','first');
  const refreshing=h.run('rtl.refreshStructure');await entered;h.close();assert.ok(captured!.aborted);
  release();await refreshing;assert.equal((await h.state()).stale,true);
  await h.run('rtl.refreshStructure');assert.equal((await h.state()).stale,false);
});

test('structure host distinguishes X/Z and unmapped ports without querying ambiguous channels', async () => {
  const names = ['x_value','z_value','missing_value','ambiguous_value','wrong_width','unsupported_value'];
  const leaf:HierarchyNode = { ...node('top.dut'), instancePath:['top','dut'], ports:names.map(name=>({
    name,direction:'input',type:'logic[7:0]',location:point,
    signalType:{text:'logic[7:0]',simpleIntegral:true,width:8},connection:{kind:'expression',text:name,references:[]}
  })) };
  const root:HierarchyNode = {...node('top',[leaf]),module:'top',instancePath:['top']};
  const data = parseVcd('$timescale 1ns $end $scope module TOP $end $scope module top $end $scope module dut $end $var wire 8 ! x_value [7:0] $end $var wire 8 " z_value [7:0] $end $var wire 8 # ambiguous_value [7:0] $end $var wire 8 $ ambiguous_value [7:0] $end $var wire 4 % wrong_width [3:0] $end $var real 8 & unsupported_value $end $upscope $end $upscope $end $upscope $end $enddefinitions $end #0 bxxxxxxxx ! bzzzzzzzz " b00000001 # b00000010 $ b0001 % r1.0 & #5');
  const queries:string[][]=[];
  let invalidate!:()=>void;
  const traces={changed(){},async open(result:any){
    let state={state:'ready',time:'0',revision:0};const listeners=new Set<()=>void>();
    invalidate=()=>{state={...state,state:'unavailable',revision:1};listeners.forEach(f=>f());};
    return {result,metadata:data,read:()=>({...state}),subscribe:(f:()=>void)=>{listeners.add(f);return disposable();},
      values:async(request:any)=>{queries.push(request.signals);return {cursor:request.cursor,rows:request.signals.map((id:string)=>({id,value:data.channels.get(data.signals.find(s=>s.id===id)!.code)!.at(-1)!.value}))};},
      invalidate,dispose(){listeners.clear();}};
  }};
  const h=await harness(async()=>({roots:[root],diagnostics:[]}),traces);
  h.archives.set('states',{runId:'states',project:{root:'D:/fixture',name:'fixture',tests:[{name:'first',top:'top'}]}});
  await h.run('rtl.showRecordedStructure',{runId:'states',name:'first',top:'top',directory:'D:/fixture/.rtl/runs/states'});
  await h.run('rtl.inspectStructure','top.dut');
  const state=await h.state();
  assert.deepEqual(Object.values(state.trace.values).map((v:any)=>v.text),['0xXX','0xZZ','Not recorded','Ambiguous path','Width mismatch','Unsupported type']);
  assert.ok(queries.length>0);assert.ok(queries.every(ids=>ids.length===2 && ids.includes('0') && ids.includes('1')), 'Only exact matched channels may be queried');
  invalidate();await Promise.resolve();
  assert.ok(Object.values((await h.state()).trace.values).every((v:any)=>v.text==='Unavailable'), 'Invalidation must override all previous values and binding labels');
});
