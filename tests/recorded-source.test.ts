import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { build } from 'esbuild';
import vm from 'node:vm';
import { createRequire } from 'node:module';

test('recorded source viewer restricts files, preserves source position and separates equal run IDs across projects', async () => {
  const output = await build({ entryPoints:['packages/vscode/src/recorded-source.ts'], bundle:true, platform:'node', format:'cjs', write:false, external:['vscode','@rtl-dev/core'] });
  const commands = new Map<string, any>(), docs = new Map<string, any>(), opened:any[] = [];
  let provider:any, damaged=false;
  const disposable = () => ({ dispose() {} });
  const uri = (value:any) => ({ ...value, toString:() => JSON.stringify(value) });
  const vscode = {
    Uri:{from:uri,file:(fsPath:string)=>({fsPath})}, Position:class { constructor(public line:number,public character:number) {} }, Range:class { constructor(public start:any,public end:any) {} },
    workspace:{ registerTextDocumentContentProvider:(_scheme:string,value:any)=>{provider=value;return disposable();},
      fs:{readFile:async(file:any)=> Buffer.from(file.fsPath)},
      openTextDocument:async(value:any)=>{const doc={uri:value,text:await provider.provideTextDocumentContent(value)};docs.set(value.toString(),doc);return doc;} },
    languages:{setTextDocumentLanguage:async(doc:any,language:string)=>{doc.languageId=language;}},
    window:{showTextDocument:async(doc:any,options:any)=>{opened.push({doc,options});}},
    commands:{registerCommand:(name:string,callback:any)=>{commands.set(name,callback);return disposable();}}
  };
  const require = createRequire(import.meta.url), module={exports:{} as {registerRecordedSources(ctx:any):void}};
  vm.runInNewContext(output.outputFiles[0].text, {module,exports:module.exports,process,Buffer,URLSearchParams,
    require:(id:string)=> id==='vscode'?vscode:id==='@rtl-dev/core'?{loadRecordedInputs:async(result:any)=>{
      if(damaged) throw Error('damaged archive');
      const root=path.join(result.directory,'inputs'), file=path.join(root,'rtl','dut.sv');
      return {runId:result.runId,project:{root},target:{sources:[file]},sourceMappings:[{original:'D:/current/dut.sv',recorded:file}]};
    }}:require(id) });
  module.exports.registerRecordedSources({subscriptions:[]});
  const open=commands.get('rtl.openRecordedSource')!;
  const first={runId:'same',directory:'D:/a/.rtl/runs/same'}, second={runId:'same',directory:'D:/b/.rtl/runs/same'};
  const a=await open(first,undefined,{line:8,character:3}), b=await open(second);
  assert.notEqual(a,b); assert.equal(opened[0].options.selection.start.line,8);
  assert.equal(opened[0].options.selection.start.character,3); assert.equal(opened[0].doc.languageId,'systemverilog');
  assert.equal(opened[0].doc.uri.scheme,'rtl-recorded');
  await assert.rejects(open(first,'D:/current/dut.sv'),/not part/);
  assert.equal(opened.length,2);
  damaged=true;
  await assert.rejects(provider.provideTextDocumentContent(docs.get(a).uri),/damaged/);
});
