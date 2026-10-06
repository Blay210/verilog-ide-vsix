import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {createProject,loadProject,runTest,readHistory,loadRecordedTrace,type SimulatorBackend} from '@rtl-dev/core';
const vcd='$timescale 1ns $end\n$scope module TOP $end\n$scope module counter_basic_tb $end\n$var wire 8 ! count [7:0] $end\n$upscope $end\n$upscope $end\n$enddefinitions $end\n#0\nb00000001 !\n#1\nb00000010 !\n';
async function fixture(){const base=path.resolve('.dev/tests');await mkdir(base,{recursive:true});const root=await mkdtemp(path.join(base,'trace-한글 '));await createProject(root,true);return loadProject(root);}
const backend:SimulatorBackend={id:'verilator',capabilities:{timing:true,waveforms:['vcd','fst','none'],inputSnapshot:true},check:async()=>{},build:async r=>({executable:'mock',cwd:r.directory}),run:async a=>{await writeFile(path.join(a.cwd,'wave.vcd'),vcd);}};
test('recorded trace binds exact bytes, source fingerprint and run, surviving original changes',async()=>{
  const project=await fixture(),result=await runTest(project,project.tests[0],backend);
  assert.equal(result.traceIdentity?.state,'ready');assert.equal(result.traceIdentity?.runId,result.runId);
  const loaded=await loadRecordedTrace((await readHistory(project.root))[0]);assert.equal(loaded.bytes.toString(),vcd);
  await writeFile(project.sources[0],'invalid current source');assert.equal((await loadRecordedTrace(result)).sha256,loaded.sha256);
  await writeFile(result.waveform!,vcd.replace('00000010','00000111'));
  await assert.rejects(loadRecordedTrace(result),/modified/);
  await writeFile(result.waveform!,vcd);assert.equal((await loadRecordedTrace(result)).sha256,loaded.sha256);
  const other=await runTest(project,project.tests[0],backend);
  await assert.rejects(loadRecordedTrace({...other,traceIdentity:result.traceIdentity}),/run identity mismatch/);
  await assert.rejects(loadRecordedTrace({...result,traceIdentity:{...result.traceIdentity!,file:'../wave.vcd'}}),/directory/);
  await assert.rejects(loadRecordedTrace({...result,waveform:other.waveform}),/directory/);
  const signal=new AbortController();signal.abort();await assert.rejects(loadRecordedTrace(result,signal.signal));
});
test('legacy/future trace identity preserves ordinary history; unsupported FST never binds values',async()=>{
  const project=await fixture(),result=await runTest(project,project.tests[0],backend);
  await assert.rejects(loadRecordedTrace({...result,traceIdentity:undefined}),/Older waveforms/);
  await writeFile(path.join(result.directory,'result.json'),JSON.stringify({...result,traceIdentity:{version:99,state:'ready'}}));
  const rows=await readHistory(project.root);assert.equal(rows.length,1);assert.equal(rows[0].traceIdentity?.state,'unavailable');
  await assert.rejects(loadRecordedTrace(rows[0]),/Unsupported/);assert.ok((await readFile(rows[0].log)).length);
  const fst:SimulatorBackend={...backend,run:async a=>{await writeFile(path.join(a.cwd,'wave.fst'),'mock-fst');}};
  const saved=await runTest({...project,waveform:'fst'},project.tests[0],fst);assert.equal(saved.traceIdentity?.state,'ready');
  await assert.rejects(loadRecordedTrace(saved),/VCD only/);
});
