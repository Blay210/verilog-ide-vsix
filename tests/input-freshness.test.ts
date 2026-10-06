import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { captureInputs, compareConfiguredResultInputs, type Project, type TestResult } from '@rtl-dev/core';
import { InputFreshness, affectsEntry, freshnessLabel } from '../packages/vscode/src/input-freshness';

const tick = () => new Promise(resolve => setTimeout(resolve, 10));
async function fixture() {
  await mkdir('.dev/tests', {recursive:true});
  const root = await mkdtemp(path.resolve('.dev/tests/freshness-한글 '));
  const files = ['pkg_b.sv','pkg_a.sv','dut.sv','tb.sv'].map(file=>path.join(root,file));
  for (const file of files) await writeFile(file, '// original');
  const project: Project = {root,name:'same',sources:files.slice(0,3),packageSources:files.slice(0,2),packageOrder:'auto',includeDirs:[],defines:{},backend:'verilator',timing:true,waveform:'vcd',tests:[{name:'test',top:'tb',sources:[files[3]],timeoutMs:60000}]};
  const built = {...project,sources:[files[1],files[0],files[2]]};
  const result: TestResult = {name:'test',top:'tb',status:'passed',durationMs:1,directory:root,log:'log',inputIdentity:await captureInputs(built,built.tests[0])};
  return {project,result,files};
}

test('automatic ordering comparison reuses only package permutation, tracks bytes and settings without elaboration',async()=>{
  const {project,result,files} = await fixture();
  assert.equal((await compareConfiguredResultInputs(result,project)).state,'matching');
  assert.equal((await compareConfiguredResultInputs(result,{...project,packageOrder:'manifest'})).state,'changed','Manual source order stays authoritative');
  for (const update of [{defines:{MODE:'1'}},{waveform:'fst' as const},{tests:[{...project.tests[0],top:'other'}]}])
    assert.equal((await compareConfiguredResultInputs(result,{...project,...update})).state,'changed');
  await writeFile(files[2],'// DUT changed');
  assert.equal((await compareConfiguredResultInputs(result,project)).state,'changed');
  await writeFile(files[2],'// original');
  await writeFile(files[0],'// package dependency changed');
  assert.equal((await compareConfiguredResultInputs(result,project)).state,'changed');
  assert.equal(result.status,'passed');
  assert.equal((await compareConfiguredResultInputs({...result,inputIdentity:undefined},project)).state,'legacy');
});

test('configured headers, dirty manifest and Unicode paths affect only related targets',async()=>{
  const {project,result} = await fixture();
  const entry={id:'one',project:{...project,includeDirs:[path.join(project.root,'include')]},target:project.tests[0],result};
  assert.equal(affectsEntry(entry,path.join(project.root,'rtl.toml')),true);
  assert.equal(affectsEntry(entry,path.join(project.root,'include','nested','defs.inc')),true);
  assert.equal(affectsEntry(entry,path.join(project.root,'include-other','defs.inc')),false);
  assert.equal(affectsEntry(entry,path.join(project.root,'README.md')),false);
  assert.equal(freshnessLabel({state:'changed'},true),'Outdated · Unsaved edits');
  assert.equal(freshnessLabel({state:'legacy'}),'Inputs unknown');
});

test('refresh aborts stale comparisons and preserves distinct targets, legacy, errors and disposal',async()=>{
  const {project,result} = await fixture();
  let release!: (value:any)=>void; let firstSignal!:AbortSignal; let calls=0,notifications=0;
  const state = new InputFreshness(async (_result,_project,signal)=>{
    if (++calls === 1) {firstSignal=signal; return new Promise(resolve=>{release=resolve;});}
    return {state:'matching',message:'new run'};
  },()=>notifications++,0);
  const entry={id:'folder-a#test',project,target:project.tests[0],result};
  state.refresh([entry],true); await tick();
  state.refresh([entry,{...entry,id:'folder-b#test',result:undefined}],true);
  assert.equal(firstSignal.aborted,true); await tick();
  release({state:'changed',message:'stale'}); await tick();
  assert.equal(state.get(entry.id).state,'matching'); assert.equal(state.get('folder-b#test').state,'notRun');
  state.refresh([entry],false); assert.equal(state.get(entry.id).state,'unavailable');
  const before=notifications; state.dispose(); state.refresh([entry],true); await tick(); assert.equal(notifications,before);
  const failures = new InputFreshness(async result=>{if(!result.inputIdentity)return {state:'legacy',message:'older'};throw Error('read failed');},()=>{},0);
  failures.refresh([entry,{...entry,id:'older',result:{...result,inputIdentity:undefined}}],true); await tick();
  assert.equal(failures.get(entry.id).state,'unavailable'); assert.equal(failures.get('older').state,'legacy'); failures.dispose();
});
