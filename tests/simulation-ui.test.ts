import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import vm from 'node:vm';
import type { SimulationSnapshot } from '../packages/vscode/src/simulation-summary';
test('native simulation view keeps target identity and result actions through progress updates',async()=>{
  let provider:any, changed:()=>void=()=>{}; const view:any={dispose(){},selection:[]}; let multiple=false;
  const bar:any={show(){},dispose(){}};
  class TreeItem {constructor(public label:string){} }
  const output=await build({entryPoints:['packages/vscode/src/simulation-ui.ts'],bundle:true,platform:'node',format:'cjs',write:false,external:['vscode']});
  const mock={TreeItem,ThemeIcon:class {constructor(public id:string){}},StatusBarAlignment:{Left:1},window:{createTreeView:(_id:string,options:any)=>{provider=options.treeDataProvider;multiple=options.canSelectMany;return view;},createStatusBarItem:()=>bar}};
  const module={exports:{} as any}; vm.runInNewContext(output.outputFiles[0].text,{module,exports:module.exports,require:()=>mock});
  let state:SimulationSnapshot={phase:'ready',targets:[],active:[],statuses:[],selected:'same / test',tests:[
    {id:'folder-a#test',name:'test',project:'same',root:'D:/a',top:'top',selected:true},
    {id:'folder-b#test',name:'test',project:'same',root:'D:/b',top:'top',selected:false}
  ]};
  const ui=module.exports.registerSimulationUi({subscriptions:[]},(listener:()=>void)=>{changed=listener;return {dispose(){}};},()=>state);
  const items=()=>provider.getChildren().map((n:any)=>provider.getTreeItem(n));
  const targets=items().filter((i:any)=>i.contextValue === 'rtlSimulationTest');
  assert.notEqual(targets[0].id,targets[1].id); assert.notEqual(targets[0].tooltip,targets[1].tooltip);
  assert.equal(targets[1].command.arguments[0],'folder-b#test');
  assert.equal(items().length,2,'Only targets appear in the test list'); assert.equal(multiple,true);
  view.selection=provider.getChildren(); assert.deepEqual(Array.from(ui.selectedIds()),['folder-a#test','folder-b#test']);
  state={...state,phase:'running',canStop:true,targets:['same/test'],active:['same/test']}; changed();
  state.tests[0].running=true; changed(); assert.match(bar.text,/Running/); assert.match(view.message,/Running/);
  assert.equal(items()[0].iconPath.id,'sync~spin'); assert.equal(items()[1].iconPath.id,'circuit-board','Same display names cannot share active state');
  state={...state,phase:'completed',canStop:false,active:[],statuses:['timedOut'],latest:{name:'test',status:'timedOut',durationMs:1234}}; changed();
  state.tests[0]={...state.tests[0],running:false,status:'timedOut',waveform:true,durationMs:1234}; changed();
  assert.match(bar.text,/timedOut/); assert.equal(items()[0].contextValue,'rtlSimulationWaveform'); assert.match(items()[0].description,/timedOut.*1.23s/);
  assert.ok(items().every((i:any)=>i.command?.command === 'rtl.selectTarget'),'Row click selects without executing');
  state.tests[0]={...state.tests[0],status:'passed',freshness:{state:'changed',message:'DUT changed'},unsaved:true}; changed();
  assert.equal(items()[0].iconPath.id,'warning'); assert.match(items()[0].description,/passed.*Outdated.*Unsaved edits/);
  assert.match(items()[0].tooltip,/DUT changed/); assert.equal(items()[0].contextValue,'rtlSimulationWaveform');
  state.tests[0].freshness={state:'unavailable',message:'Read failed'}; changed();
  assert.match(items()[0].description,/Inputs unknown/); assert.doesNotMatch(items()[0].description,/Outdated/);
});
