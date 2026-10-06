import test from 'node:test';
import assert from 'node:assert/strict';
import { renderStructure } from '../packages/vscode/src/structure-view';
import type { HierarchyNode } from '@rtl-dev/semantic';
import vm from 'node:vm';
import { StructureNavigation } from '../packages/vscode/src/structure-navigation';

const location = { file: 'D:/project/design.sv', offset: 0, line: 0, character: 0 };

test('recorded context labels provenance and escapes run metadata', () => {
  const root: HierarchyNode = { id:'top',name:'top',module:'top',kind:'instance',location,parameters:[],ports:[],children:[] };
  const navigation = new StructureNavigation(); navigation.update([root],'run');
  const result = renderStructure(root,'nonce',false,{ navigation:navigation.state(), context:{project:'project',mode:'recorded',runId:'<run>',startedAt:'<time>'} });
  assert.match(result.html,/Recorded run/); assert.match(result.html,/&lt;run&gt;/); assert.match(result.html,/&lt;time&gt;/);
  assert.match(result.html,/Explore current design/); assert.match(result.html,/read-only recorded files/);
  assert.doesNotMatch(result.html,/<run>|<time>/);
});
const node: HierarchyNode = { id: 'top.dut', name: 'dut', kind: 'instance', module: 'dut', location, definition: location, parameters: [{ name: 'W', value: '8', overridden: true, local: false, location }], children: [], ports: [
  { name: 'a', direction: 'input', type: 'logic[7:0]', location, connection: { kind: 'expression', text: 'x[7:0]', location, references: [{ name: 'x', path: 'top.x', location }] } },
  { name: 'y', direction: 'output', type: 'logic[7:0]', location, connection: { kind: 'expression', text: 'y', location, references: [] } },
  { name: 'unused', direction: 'output', type: 'logic', location, connection: { kind: 'unconnected', text: '', references: [] } }
] };

test('canvas identity isolates identical scopes across project roots and recorded runs',()=>{
  const navigation=new StructureNavigation(); navigation.update([node],'context');
  const view=(root:string,mode:'current'|'recorded',runId?:string)=>renderStructure(node,'nonce',false,{navigation:navigation.state(),context:{project:'same',root,mode,runId}}).html;
  const keys=[view('D:/a','current'),view('D:/b','current'),view('D:/a','recorded','run1'),view('D:/a','recorded','run2')].map(html=>html.match(/data-view-key="([^"]+)"/)![1]);
  assert.equal(new Set(keys).size,4);
  assert.match(view('D:/a','current'),/data-camera="fit"/);
  assert.match(view('D:/a','current'),/id="structure-scene"/);
});
test('structure view maps source targets and shows binding direction without wiring unconnected ports', () => {
  const view = renderStructure(node, '0123456789abcdef');
  assert.match(view.html, /marker-end="url\(#arrow\)"/); assert.match(view.html, /marker-start="url\(#back\)"/);
  assert.equal(view.html.match(/class="wire"/g)?.length, 2);
  assert.match(view.html, /Unconnected/); assert.match(view.html, /logic\[7:0\]/); assert.match(view.html, /Override/);
  assert.ok(view.links.size > 0); assert.ok([...view.links.values()].every(p => p.file === location.file));
  assert.ok(!view.html.includes(location.file), 'HTML must not expose executable file links');
  assert.equal(view.nodes.get(node.id), node);
});
test('source strings are escaped, scripts use a nonce, stale source navigation is disabled', () => {
  const malicious = '</text><script>alert(1)</script>&"';
  const view = renderStructure({ ...node, id: malicious, module: malicious, parameters: [{ ...node.parameters[0], value: malicious }] }, 'abc123', true);
  assert.ok(!view.html.includes(malicious)); assert.match(view.html, /&lt;script&gt;/);
  assert.match(view.html, /default-src 'none'/); assert.match(view.html, /script-src 'nonce-abc123'/);
  assert.match(view.html, /Sources changed/); assert.match(view.html, /disabled/);
});
test('diagram traverses generate groups but stops at child instances and bounds rendered rows', () => {
  const nested = { ...node, id: 'top.dut.g[0].leaf', children: [] };
  const root: HierarchyNode = { ...node, id: 'top', children: [{ ...node, kind: 'generate', id: 'top.g', children: [{ ...node, children: [nested] }] }] };
  const view = renderStructure(root, 'abc123');
  assert.equal(view.nodes.size, 1); assert.ok(!view.nodes.has(nested.id));
  const large = renderStructure({ ...node, ports: Array.from({ length: 250 }, () => node.ports[0]) }, 'abc123');
  assert.match(large.html, /limited to 200/); assert.equal(large.html.match(/class="wire"/g)?.length, 200);
});

test('scope controls expose test top, breadcrumbs and modules while escaping all context labels',()=>{
  const root={...node,id:'top',name:'top',children:[node]};
  const navigation=new StructureNavigation();navigation.update([root],'context');navigation.visit(node.id);
  const view=renderStructure(node,'abc123',false,{navigation:navigation.state(),context:{project:'project <script>',test:'test <script>',top:'top'}});
  assert.match(view.html,/aria-label="Instance path"/);assert.match(view.html,/Test top · top/);assert.match(view.html,/Module instance · top.dut/);
  assert.match(view.html,/No child modules/);assert.ok(!view.html.includes('project <script>'));assert.ok(view.nodes.has('top'));
});

test('actual webview script routes explicit controls, card double-click/keyboard and blocks stale input',()=>{
  function runtime(stale:boolean) {
    const view=renderStructure({...node,id:'top',children:[node]},'abc123',stale);
    const listeners=new Map<string,(event:any)=>void>(),sent:any[]=[];
    vm.runInNewContext(view.html.match(/<script nonce="abc123">([\s\S]*?)<\/script>/)![1],{
      acquireVsCodeApi:()=>({postMessage:(message:any)=>sent.push(message)}),
      document:{addEventListener:(name:string,listener:any)=>listeners.set(name,listener)}
    });
    const event=(tagName:string,dataset:Record<string,string>,key?:string)=>({key,preventDefault(){},target:{tagName,dataset,disabled:false,value:node.id,
      closest(selector:string){ if(selector==='[data-source],button')return tagName==='button'||dataset.source!==undefined?this:undefined;return this;},
      matches:()=>true}});
    return {listeners,sent,event};
  }
  const ready=runtime(false);
  ready.listeners.get('click')!(ready.event('g',{node:node.id}));assert.equal(ready.sent.length,0,'Single card click must not trigger drill-down');
  ready.listeners.get('dblclick')!(ready.event('g',{node:node.id}));
  ready.listeners.get('click')!(ready.event('button',{node:node.id}));
  ready.listeners.get('keydown')!(ready.event('g',{node:node.id},'Enter'));
  ready.listeners.get('change')!(ready.event('select',{}));
  assert.equal(ready.sent.length,4);
  assert.ok(ready.sent.every(message=>message.action==='node'&&message.id===node.id&&message.snapshot==='abc123'));
  const stale=runtime(true);
  for(const kind of ['click','dblclick','keydown','change'])stale.listeners.get(kind)!(stale.event(kind==='click'?'button':'g',{node:node.id},'Enter'));
  assert.equal(stale.sent.length,0);
  stale.listeners.get('click')!(stale.event('button',{action:'refresh'}));assert.equal(stale.sent[0].action,'refresh');
});

test('recorded value script validates page/revision, uses text and disables damaged trace controls',()=>{
  const navigation=new StructureNavigation();navigation.update([node],'recorded');
  const view=renderStructure(node,'abc123',false,{navigation:navigation.state(),context:{project:'fixture',mode:'recorded',runId:'run'},trace:{state:'ready',time:'0 ps',end:'10 ns'}});
  assert.match(view.html,/Open linked waveform/);assert.match(view.html,/Value at cursor/);assert.doesNotMatch(view.html,/cursor A/);assert.ok(view.ports.size>0);
  const sent:any[]=[],windowListeners=new Map<string,(event:any)=>void>();let enter!:(event:any)=>void;
  const input={value:'0 ps',disabled:false,addEventListener:(_:string,listener:any)=>{enter=listener;}};
  const status={textContent:''},buttons=[{disabled:false},{disabled:false}],cell={dataset:{portValue:'0'},tagName:'TD',textContent:'',setAttribute(){}};
  vm.runInNewContext(view.html.match(/<script nonce="abc123">([\s\S]*?)<\/script>/)![1],{
    acquireVsCodeApi:()=>({postMessage:(message:any)=>sent.push(message)}),
    window:{addEventListener:(name:string,listener:any)=>windowListeners.set(name,listener)},
    document:{addEventListener(){},getElementById:(id:string)=>id==='trace-time'?input:status,querySelectorAll:(selector:string)=>selector==='[data-port-value]'?[cell]:buttons}
  });
  assert.equal(sent[0].action,'traceReady');
  const receive=windowListeners.get('message')!;
  const message={kind:'traceValues',snapshot:'abc123',revision:2,time:'5 ns',status:'Verified observation',values:{'0':{text:'0xXZ',reason:'xxxxzzzz'}}};
  receive({data:{...message,snapshot:'old'}});assert.equal(cell.textContent,'');
  receive({data:message});assert.equal(cell.textContent,'0xXZ');assert.equal(input.value,'5 ns');
  receive({data:{...message,revision:1,values:{'0':{text:'old'}}}});assert.equal(cell.textContent,'0xXZ');
  input.value='8 ns';enter({key:'Enter',target:input});assert.equal(sent.at(-1).id,'8 ns');
  receive({data:{...message,revision:3,unavailable:true,values:{'0':{text:'Unavailable'}},status:'Trace changed'}});
  assert.equal(cell.textContent,'Unavailable');assert.ok(input.disabled&&buttons.every(button=>button.disabled));
  const length=sent.length;enter({key:'Enter',target:input});assert.equal(sent.length,length);
});
