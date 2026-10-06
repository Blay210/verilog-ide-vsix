import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,mkdtemp,cp,readFile,writeFile,rename,readdir,stat} from 'node:fs/promises';
import {loadProject,runTest,loadRecordedInputs,compareResultInputs,prepareProject,type SimulatorBackend} from '@rtl-dev/core';
import {detectTools,detectSemanticRuntime} from '@rtl-dev/toolchain';
import {VerilatorBackend} from '@rtl-dev/verilator';
import {SlangProvider} from '@rtl-dev/semantic';

test('native include order and nested headers survive copies, original mutations and missing manifest',
  {skip:process.env.RTL_INTEGRATION!=='1',timeout:360000},async()=>{
    const base=path.resolve('.dev/integration');await mkdir(base,{recursive:true});
    const folder=await mkdtemp(path.join(base,'includes-')),root=path.join(folder,'한글 project');
    await cp('examples/include-counter',root,{recursive:true,filter:file=>!file.split(path.sep).includes('.rtl')});
    const project=await loadProject(root);project.tests.forEach(target=>target.timeoutMs=120000);
    const tools=await detectTools(),python=await detectSemanticRuntime();assert.ok(tools.toolchain);assert.ok(python);
    const native=new VerilatorBackend(tools.toolchain),provider=new SlangProvider(python,path.resolve('packages/semantic/python/analyze.py'),path.join(folder,'cache'));
    const originalBackend:SimulatorBackend={id:native.id,capabilities:{...native.capabilities,inputSnapshot:false},check:c=>native.check(c),build:(r,c)=>native.build(r,c),run:(a,c)=>native.run(a,c)};
    const baseline=await runTest({...project,waveform:'none'},project.tests[0],originalBackend,{packageProvider:provider});
    assert.equal(baseline.status,'passed',baseline.message);
    const header=path.join(project.includeDirs[0],'nested/width.svh'),original=await readFile(header);
    const wrapped:SimulatorBackend={id:native.id,capabilities:native.capabilities,check:c=>native.check(c),run:(a,c)=>native.run(a,c),build:async(r,c)=>{
      await writeFile(header,'invalid current include before compilation');
      assert.deepEqual(await readFile(path.join(r.project.includeDirs[0],'nested/width.svh')),original);
      return native.build(r,c);
    }};
    const results=[];
    for(const [index,target] of project.tests.entries()) {
      let result;
      try {result=await runTest({...project,waveform:index?'fst':'vcd'},target,wrapped,{packageProvider:provider});}
      finally {await writeFile(header,original);}
      assert.equal(result.status,'passed',result.message);assert.equal(result.inputSnapshot?.state,'ready',result.inputSnapshot?.reason);
      assert.ok(result.waveform?.endsWith(index?'.fst':'.vcd'));assert.ok((await stat(result.waveform!)).size>0);
      results.push(result);
      const prepared=await prepareProject({...project,waveform:index?'fst':'vcd'},provider);
      assert.equal((await compareResultInputs(result,prepared)).state,'matching');
    }
    const manifest=path.join(root,'rtl.toml'),backup=path.join(root,'.rtl/manifest-backup.toml');await rename(manifest,backup);
    try {
      await writeFile(header,'invalid current include');
      for(const result of results) {
        const saved=await loadRecordedInputs(result),design=await provider.hierarchy(saved.project,saved.target.name,[]);
        assert.equal(design.diagnostics.filter(d=>d.severity==='error').length,0,JSON.stringify(design.diagnostics));
        const dut=design.roots[0].children.find(node=>node.module==='counter')!;
        assert.ok(dut.ports.some(port=>port.name==='count'));
        const analysis=await provider.analyze(saved.project,[]);
        const instance=analysis.instances.find(instance=>instance.module==='counter')!;
        assert.equal(instance.ports.find(port=>port.name==='count')!.signalType?.width,8);
      }
    } finally {await writeFile(header,original);await rename(backup,manifest);}
    assert.deepEqual((await readdir(root)).sort(),['.gitignore','.rtl','README.md','include','rtl','rtl.toml','tb']);
    await writeFile('.dev/d2b3-include-native-receipt.json',JSON.stringify({passed:true,root,baseline:baseline.status,runs:results.map(r=>({name:r.name,runId:r.runId,status:r.status,waveform:r.waveform,snapshot:r.inputSnapshot?.state}))},null,2));
});
