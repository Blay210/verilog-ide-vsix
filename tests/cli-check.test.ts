import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import vm from 'node:vm';
import { createRequire } from 'node:module';

test('CLI check without GTKWave explains IDE VCD support and external FST viewing', async () => {
  const compiled=await build({entryPoints:['packages/cli/src/cli.ts'],bundle:true,platform:'node',format:'cjs',write:false,external:['@rtl-dev/core','@rtl-dev/semantic','@rtl-dev/verilator','@rtl-dev/toolchain']});
  const logs:string[]=[];
  let verifications=0;
  let finish!:()=>void;
  const complete=new Promise<void>(resolve=>{finish=resolve;});
  const processStub={argv:['node','rtl','check'],cwd:()=> 'D:/fixture',once(){},stdout:{write(){}},exitCode:undefined as number|undefined};
  const mocks:Record<string,unknown>={
    '@rtl-dev/core':{loadProject:async()=>({name:'example',backend:'verilator',tests:[{}]}),prepareProject:async()=>({sources:['D:/fixture/rtl/counter.sv']})},
    '@rtl-dev/toolchain':{detectTools:async()=>({toolchain:{compiler:'verified'},missing:[]}),verifyToolchain:async()=>{verifications++;}},
    '@rtl-dev/semantic':{},'@rtl-dev/verilator':{}
  };
  const require=createRequire(import.meta.url);
  const module={exports:{}};
  vm.runInNewContext(compiled.outputFiles[0].text,{module,exports:module.exports,require:(id:string)=>mocks[id]??require(id),process:processStub,AbortController,__dirname:'D:/fixture',console:{log:(message:string)=>{logs.push(message);if(message.includes('GTKWave'))finish();},error:(message:string)=>{logs.push(message);finish();}}});
  await complete;
  assert.equal(processStub.exitCode,undefined);
  assert.equal(verifications,1);
  assert.match(logs.at(-1)!,/VCD.*RTL IDE built-in viewer/);
  assert.match(logs.at(-1)!,/FST.*external viewer.*GTKWave/);
});
