import * as vscode from 'vscode';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import type { SimulationSnapshot } from '../../packages/vscode/src/simulation-summary';

export async function testFreshness(): Promise<void> {
  const root=vscode.workspace.workspaceFolders![0].uri.fsPath;
  const manifest=path.join(root,'rtl.toml'), dut=path.join(root,'rtl/counter.sv');
  // The generated example names are read from its manifest rather than inferred.
  const {loadProject}=await import('@rtl-dev/core');
  const project=await loadProject(root); const basic=project.tests[0], other=project.tests[1];
  const source=basic.sources[0];
  const originalDut=await readFile(dut,'utf8'), originalTb=await readFile(source,'utf8'), originalManifest=await readFile(manifest,'utf8');
  const status=()=>vscode.commands.executeCommand<SimulationSnapshot>('rtl.getSimulationStatus');
  async function wait(predicate:(state:SimulationSnapshot)=>boolean, label:string) {
    const deadline=Date.now()+30000;
    while(Date.now()<deadline) {const state=await status();if(predicate(state)) return state;await new Promise(resolve=>setTimeout(resolve,100));}
    throw Error(`Timed out: ${label}: ${JSON.stringify(await status())}`);
  }
  const states=(state:SimulationSnapshot)=>state.tests.map(test=>test.freshness?.state);
  await vscode.commands.executeCommand('rtl.refresh');
  assert.ok((await status()).tests.every(test=>test.freshness?.state==='notRun'));
  await vscode.commands.executeCommand('rtl.runAll');
  const baseline=await wait(state=>state.tests.length===2 && states(state).every(value=>value==='matching'),'native baseline');
  assert.ok(baseline.tests.every(test=>test.status==='passed'&&test.waveform),'Both native runs must succeed');
  try {
    await writeFile(dut,originalDut+'\n// changed DUT\n');
    await wait(state=>states(state).every(value=>value==='changed'),'shared DUT watch');
    assert.ok((await status()).tests.every(test=>test.status==='passed'),'Outdated never rewrites PASS');
    await writeFile(dut,originalDut); await wait(state=>states(state).every(value=>value==='matching'),'DUT restore');
    const document=await vscode.workspace.openTextDocument(source); await vscode.window.showTextDocument(document);
    const edit=new vscode.WorkspaceEdit(); edit.insert(document.uri,new vscode.Position(document.lineCount,0),'\n// unsaved TB edit\n');
    assert.equal(await vscode.workspace.applyEdit(edit),true);
    const dirty=await wait(state=>state.tests.find(test=>test.name===basic.name)?.unsaved===true,'dirty TB');
    assert.equal(dirty.tests.find(test=>test.name===other.name)?.unsaved,false);
    assert.equal(dirty.tests.find(test=>test.name===basic.name)?.freshness?.state,'matching');
    await document.save();
    await wait(state=>state.tests.find(test=>test.name===basic.name)?.freshness?.state==='changed'&&state.tests.find(test=>test.name===other.name)?.freshness?.state==='matching','saved TB isolation');
    const reset=new vscode.WorkspaceEdit(); reset.replace(document.uri,new vscode.Range(document.positionAt(0),document.positionAt(document.getText().length)),originalTb);
    await vscode.workspace.applyEdit(reset); await document.save();
    await wait(state=>states(state).every(value=>value==='matching')&&state.tests.every(test=>!test.unsaved),'TB restore');
    await writeFile(manifest,originalManifest.replace('waveform = "vcd"','waveform = "fst"'));
    await wait(state=>states(state).every(value=>value==='changed'),'waveform setting');
    await writeFile(manifest,originalManifest); await wait(state=>states(state).every(value=>value==='matching'),'settings restore');
    await mkdir(path.join(root,'.rtl'),{recursive:true});
    await writeFile(path.join(root,'.rtl/extension-test.json'),JSON.stringify({passed:true,freshness:true,nativeRuns:2,checks:['DUT watch','PASS preserved','dirty separation','TB isolation','saved restore','settings change']}));
  } finally {await writeFile(dut,originalDut);await writeFile(source,originalTb);await writeFile(manifest,originalManifest);}
}
