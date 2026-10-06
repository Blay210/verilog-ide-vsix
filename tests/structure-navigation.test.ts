import test from 'node:test';
import assert from 'node:assert/strict';
import {StructureNavigation,instanceChildren} from '../packages/vscode/src/structure-navigation';
import type {HierarchyNode} from '@rtl-dev/semantic';
const point={file:'D:/test/design.sv',offset:0,line:0,character:0};
const node=(id:string,children:HierarchyNode[]=[],kind:HierarchyNode['kind']='instance'):HierarchyNode=>({id,name:id,kind,module:kind==='instance'?'unit':undefined,location:point,parameters:[],ports:[],children});
const leaf=node('top.dut.g[1].escaped.name');
const generate=node('top.dut.g[1]',[leaf],'generate');
const array=node('top.dut.g',[generate],'array');
const dut=node('top.dut',[array]), other=node('top.other');
const top=node('top',[dut,other]);

test('navigation uses actual parents for generated arrays and names containing dots',()=>{
  const nav=new StructureNavigation();nav.update([top],'project/first');nav.visit(leaf.id);
  assert.deepEqual(nav.state().breadcrumbs.map(n=>n.id),['top','top.dut','top.dut.g','top.dut.g[1]',leaf.id]);
  nav.up();assert.equal(nav.current,generate.id);nav.back();assert.equal(nav.current,leaf.id);
  nav.forward();assert.equal(nav.current,generate.id);
  assert.deepEqual(instanceChildren(dut).map(n=>n.id),[leaf.id]);
  assert.deepEqual(nav.state().choices.map(n=>n.id),['top','top.dut','top.other']);
});
test('branching discards forward history, while visiting the same node does not create a step',()=>{
  const nav=new StructureNavigation();nav.update([top],'context');nav.visit(dut.id);nav.visit(dut.id);nav.back();
  assert.equal(nav.current,top.id);assert.equal(nav.state().canForward,true);
  nav.visit(other.id);assert.equal(nav.state().canForward,false);nav.back();assert.equal(nav.current,top.id);
});
test('refresh keeps the current scope/history or falls back to its nearest surviving parent',()=>{
  const nav=new StructureNavigation();nav.update([top],'context');nav.visit(dut.id);nav.visit(leaf.id);
  nav.update([top],'context');assert.equal(nav.current,leaf.id);nav.back();assert.equal(nav.current,dut.id);nav.forward();
  nav.update([node('top',[node('top.dut',[node('top.dut.g',[],'array')])])],'context');
  assert.equal(nav.current,array.id);assert.equal(nav.state().parent?.id,dut.id);nav.back();assert.equal(nav.current,dut.id);
});
test('changing test or project clears navigation even if instance IDs match',()=>{
  const nav=new StructureNavigation();nav.update([top],'project-A/first');nav.visit(leaf.id);
  nav.update([top],'project-A/second');assert.equal(nav.current,top.id);assert.equal(nav.state().canBack,false);
  nav.visit(dut.id);nav.update([top],'project-B/second');assert.equal(nav.current,top.id);assert.equal(nav.state().canBack,false);
});
test('invalid/ambiguous identities are rejected and an empty hierarchy clears navigation',()=>{
  const nav=new StructureNavigation();nav.update([top],'context');assert.throws(()=>nav.visit('foreign'),/current hierarchy/);
  assert.throws(()=>nav.update([node('root',[node('duplicate'),node('duplicate')])],'context'),/Duplicate/);
  assert.equal(nav.current,top.id);nav.update([],'context');assert.equal(nav.current,undefined);assert.deepEqual(nav.state().breadcrumbs,[]);
});
