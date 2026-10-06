import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,mkdtemp,writeFile,readFile,chmod,rename,symlink} from 'node:fs/promises';
import {createProject,loadProject,runTest,loadRecordedInputs,compareResultInputs,type SimulatorBackend,type Project} from '@rtl-dev/core';
async function fixture() {
  const base=path.resolve('.dev/tests');await mkdir(base,{recursive:true});
  const root=await mkdtemp(path.join(base,'include-한글 '));await createProject(root,true);
  const project=await loadProject(root);
  project.includeDirs=['headers','shadow','empty'].map(dir=>path.join(root,dir));
  for(const dir of project.includeDirs) await mkdir(dir,{recursive:true});
  await mkdir(path.join(project.includeDirs[0],'nested'));
  await writeFile(path.join(project.includeDirs[0],'settings.svh'),'`include "nested/value.svh"\n');
  await writeFile(path.join(project.includeDirs[0],'nested/value.svh'),'`define VALUE 8\n');
  await writeFile(path.join(project.includeDirs[1],'settings.svh'),'`define VALUE 99\n');
  await writeFile(project.sources[0],'`include "settings.svh" // trailing comment\nmodule counter; endmodule\n');
  return project;
}
function backend(build:(project:Project)=>Promise<void>=async()=>{}):SimulatorBackend {
  return {id:'verilator',capabilities:{timing:true,waveforms:['vcd','fst','none'],inputSnapshot:true},check:async()=>{},
    build:async request=>{await build(request.project);return {executable:'mock',cwd:request.directory};},run:async()=>{}};
}
test('configured include order, nested paths, empty roots and original changes survive archive loading',async()=>{
  const project=await fixture(),header=path.join(project.includeDirs[0],'nested/value.svh');
  const result=await runTest(project,project.tests[0],backend(async saved=>{
    assert.deepEqual(saved.includeDirs.map(dir=>path.basename(dir)),['headers','shadow','empty']);
    await writeFile(header,'`define VALUE 111');
    assert.match(await readFile(path.join(saved.includeDirs[0],'nested/value.svh'),'utf8'),/VALUE 8/);
  }));
  assert.equal(result.status,'passed');assert.equal(result.inputSnapshot?.state,'ready',result.inputSnapshot?.reason);
  const saved=await loadRecordedInputs(result);assert.equal(saved.sourceMappings.length,5);
  assert.equal((await compareResultInputs(result,project)).state,'changed');
  await writeFile(header,'`define VALUE 8\n');assert.equal((await compareResultInputs(result,project)).state,'matching');
  await writeFile(path.join(project.includeDirs[0],'new-shadow.svh'),'// new');
  assert.equal((await compareResultInputs(result,project)).state,'changed');
  await rename(path.join(project.root,'rtl.toml'),path.join(project.root,'.rtl/manifest-backup.toml'));
  assert.equal((await loadRecordedInputs(result)).project.includeDirs.length,3);
  const copied=path.join(saved.project.includeDirs[0],'nested/value.svh');await chmod(copied,0o666);await writeFile(copied,'damaged');
  await assert.rejects(loadRecordedInputs(result),/modified/);
});
test('source-local shadow, relative-only, dynamic, traversal and external includes explicitly fall back',async()=>{
  for(const scenario of ['shadow','local','dynamic','traversal','external','generated','nested-local','continued']) {
    const project=await fixture();
    if(scenario==='shadow')await writeFile(path.join(project.root,'rtl/settings.svh'),'`define VALUE 77');
    if(scenario==='local'){project.includeDirs=[];await writeFile(path.join(project.root,'rtl/settings.svh'),'`define VALUE 8');}
    if(scenario==='dynamic')await writeFile(project.sources[0],'`include `HEADER');
    if(scenario==='traversal')await writeFile(project.sources[0],'`include "../headers/settings.svh"');
    if(scenario==='external'){const external=project.root+'-external';await mkdir(external);project.includeDirs=[external];}
    if(scenario==='nested-local'){
      await writeFile(path.join(project.includeDirs[0],'settings.svh'),'`include "nested/wrapper.svh"');
      await writeFile(path.join(project.includeDirs[0],'nested/wrapper.svh'),'`include "value.svh"');
    }
    if(scenario==='continued')await writeFile(project.sources[0],'`define INC '+String.fromCharCode(92)+'\n`include "settings.svh"');
    if(scenario==='generated')await writeFile(project.sources[0],'`define INC `include "settings.svh"');
    const result=await runTest(project,project.tests[0],backend(async current=>{assert.equal(current.root,project.root);}));
    assert.equal(result.status,'passed');assert.equal(result.inputSnapshot?.state,'unavailable',scenario);assert.ok(result.inputSnapshot?.reason);
    await assert.rejects(loadRecordedInputs(result));
  }
});
test('comment and string include text does not disable snapshots; unrecorded headers are rejected',async()=>{
  const project=await fixture();
  await writeFile(project.sources[0],'// `include `IGNORED\n/* `include "missing" */\nmodule counter; string s="`include fake"; endmodule');
  const result=await runTest(project,project.tests[0],backend());
  assert.equal(result.inputSnapshot?.state,'ready',result.inputSnapshot?.reason);
  const saved=await loadRecordedInputs(result);
  await writeFile(path.join(saved.project.includeDirs[0],'extra.svh'),'// extra');
  await assert.rejects(loadRecordedInputs(result),/Unrecorded/);
});


test('missing empty include roots and tampered include order are rejected when archives load',async()=>{
  const project=await fixture(),result=await runTest(project,project.tests[0],backend()),saved=await loadRecordedInputs(result);
  const empty=saved.project.includeDirs[2]; await rename(empty,empty+'-removed');
  await assert.rejects(loadRecordedInputs(result)); await rename(empty+'-removed',empty);
  const file=path.join(result.directory,'input-snapshot.json'),manifest=JSON.parse(await readFile(file,'utf8'));
  manifest.project.includeDirs.reverse();await writeFile(file,JSON.stringify(manifest));
  await assert.rejects(loadRecordedInputs(result),/settings mismatch/);
});


test('include paths beneath a junction or symlink cannot authorize a recorded build',async()=>{
  const project=await fixture(),link=path.join(project.root,'linked');
  await symlink(project.includeDirs[0],link,process.platform==='win32'?'junction':'dir');
  project.includeDirs=[path.join(link,'nested')];
  await writeFile(project.sources[0],'`include "value.svh"');
  const result=await runTest(project,project.tests[0],backend(async current=>assert.equal(current.root,project.root)));
  assert.equal(result.status,'passed');assert.equal(result.inputSnapshot?.state,'unavailable');
  assert.match(result.inputSnapshot!.reason!,/symlink/);await assert.rejects(loadRecordedInputs(result));
});
