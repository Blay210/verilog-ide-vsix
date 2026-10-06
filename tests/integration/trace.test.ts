import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,mkdtemp,writeFile,rename} from 'node:fs/promises';
import {loadProject,runTest,loadRecordedInputs,loadRecordedTrace} from '@rtl-dev/core';
import {detectTools,detectSemanticRuntime} from '@rtl-dev/toolchain';
import {VerilatorBackend} from '@rtl-dev/verilator';
import {SlangProvider} from '@rtl-dev/semantic';
import {parseVcd,mapTracePorts,valueAt,TraceCursorHub} from '@rtl-dev/waveform';
import {WaveformSession} from '@rtl-dev/waveform/client';
import {build} from 'esbuild';
test('native recorded VCD maps exact instance ports, arrays and aliases without current sources',
 {skip:process.env.RTL_INTEGRATION!=='1',timeout:180000},async()=>{
  const base=path.resolve('.dev/integration');await mkdir(base,{recursive:true});const root=await mkdtemp(path.join(base,'trace-한글 '));
  await writeFile(path.join(root,'rtl.toml'),'version=1\n[project]\nname="trace"\n[sources]\nrtl=["design.sv"]\n[[test]]\nname="trace"\ntop="tb"\nsources=["tb.sv"]\n');
  await writeFile(path.join(root,'design.sv'),'module leaf #(parameter W=4)(input logic [W-1:0] a, output wire [W-1:0] y); timeunit 1ns; timeprecision 1ps; assign y=a; endmodule');
  await writeFile(path.join(root,'tb.sv'),String.raw`module tb;
    timeunit 1ns; timeprecision 1ps;
    logic [3:0] a=1,b=2; wire [3:0] ya,yb;
    leaf left(.a(a),.y(ya)); leaf right(.a(b),.y(yb));
    for(genvar i=0;i<2;i++)begin:g leaf u(.a(a),.y());end
    leaf pairs[1:0](.a(b),.y()); leaf \escaped.name (.a(b),.y());
    initial begin $dumpfile("wave.vcd");$dumpvars(0,tb);
      #5;a=3;b=6;#5;assert(ya==3&&yb==6)else $fatal(1,"wrong values");$finish;end
    endmodule`);
  const project=await loadProject(root);project.tests[0].timeoutMs=120000;
  const tools=await detectTools(),python=await detectSemanticRuntime();assert.ok(tools.toolchain);assert.ok(python);
  const result=await runTest(project,project.tests[0],new VerilatorBackend(tools.toolchain));assert.equal(result.status,'passed',result.message);assert.equal(result.traceIdentity?.state,'ready',result.traceIdentity?.reason);
  await rename(path.join(root,'rtl.toml'),path.join(result.directory,'original-manifest.toml'));
  await writeFile(project.sources[0],'invalid current sources');
  const saved=await loadRecordedInputs(result),trace=await loadRecordedTrace(result),data=parseVcd(trace.bytes.toString());
  const provider=new SlangProvider(python,path.resolve('packages/semantic/python/analyze.py'),path.join(root,'.rtl/semantic-cache'));
  const design=await provider.hierarchy(saved.project,saved.target.name,[]);assert.equal(design.diagnostics.filter(d=>d.severity==='error').length,0,JSON.stringify(design.diagnostics));
  const bindings=mapTracePorts(design,data.signals,'tb'),tick=BigInt(data.end)/2n;
  for(const [id,value] of [['tb.left','0011'],['tb.right','0110'],['tb.g[0].u','0011'],['tb.g[1].u','0011'],['tb.pairs[0]','0110'],['tb.pairs[1]','0110']]) {
    const binding=bindings.find(item=>item.instanceId===id&&item.port==='a')!;
    assert.equal(binding?.state,'matched',JSON.stringify({id,bindings}));assert.equal(valueAt(data.channels.get(binding.code!)!,tick),value);
  }
  const escaped=bindings.find(item=>JSON.stringify(item.instancePath)===JSON.stringify(['tb','escaped.name'])&&item.port==='a')!;
  assert.equal(escaped?.state,'matched');assert.equal(valueAt(data.channels.get(escaped.code!)!,tick),'0110');
  const receipt={passed:true,root,runId:result.runId,traceSha256:trace.sha256,bindings};
  await writeFile('.dev/d3a-native-receipt.json',JSON.stringify(receipt,null,2));
  // D3B foundation: the worker consumes exactly Core's verified byte payload.
  const worker=path.join(root,'.rtl','waveform-worker.cjs');
  await build({entryPoints:['packages/waveform/src/worker.ts'],bundle:true,platform:'node',format:'cjs',outfile:worker});
  const session=new WaveformSession(worker);
  try {
    const parsed=await session.loadVerified(trace.bytes,trace.sha256);
    await loadRecordedInputs(result);
    assert.equal(parsed.sha256,trace.sha256);assert.equal(parsed.bytes,trace.bytes.length);
    const observedBindings=mapTracePorts(design,parsed.metadata.signals,'tb');
    const chosen=observedBindings.filter(b=>b.state==='matched'&&b.port==='a');
    const hub=new TraceCursorHub();
    const identity={directory:path.resolve(result.directory).toLowerCase(),runId:trace.runId,inputFingerprint:trace.inputFingerprint,traceSha256:parsed.sha256};
    const diagram=hub.connect(identity,parsed.metadata.end,parsed.metadata.timescale,()=>{});
    const wave=hub.connect(identity,parsed.metadata.end,parsed.metadata.timescale,()=>{});
    const other=hub.connect({...identity,directory:identity.directory+'-other-project'},parsed.metadata.end,parsed.metadata.timescale,()=>assert.fail('Cross-project cursor update'));
    diagram.set(String(tick));assert.equal(wave.read().time,String(tick));
    const values=await session.values({signals:[...new Set(chosen.map(b=>b.signalId!))],cursor:wave.read().time});
    for(const binding of chosen)assert.equal(values.rows.find(row=>row.id===binding.signalId)!.value,valueAt(data.channels.get(binding.code!)!,tick));
    wave.set('0');assert.equal(diagram.read().time,'0');assert.equal(other.read().time,'0');
    diagram.invalidate('Recorded trace changed');assert.equal(wave.read().state,'unavailable');
    assert.throws(()=>wave.set('0'),/available/);
    diagram.dispose();wave.dispose();other.dispose();
    await writeFile('.dev/d3b-foundation-native-receipt.json',JSON.stringify({passed:true,root,runId:trace.runId,traceSha256:parsed.sha256,workerBytes:parsed.bytes,observedPorts:chosen.length,cursor:String(tick),values:values.rows},null,2));
  } finally {await session.dispose();}
  await writeFile(result.waveform!,trace.bytes.toString().replace('$timescale','$tampered'));await assert.rejects(loadRecordedTrace(result),/modified/);
  await writeFile(result.waveform!,trace.bytes);
 });
