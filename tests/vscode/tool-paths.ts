import * as vscode from 'vscode';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';

/** Real host + native compiler; paths are supplied by an isolated acceptance runner. */
export async function testToolPaths(): Promise<void> {
  const homeA=process.env.RTL_TEST_HOME_A, homeB=process.env.RTL_TEST_HOME_B;
  assert.ok(homeA && homeB);
  const folders=vscode.workspace.workspaceFolders!;
  assert.equal(folders.length,2);
  const settings=vscode.workspace.getConfiguration('rtl');
  const originalHome=settings.get<string>('toolsDirectory');
  const originalSemantic=settings.get<boolean>('editor.semantic');
  type Status={phase:string;tests:{id:string;name:string;root:string}[];statuses:string[];active:string[]};
  const status=()=>vscode.commands.executeCommand<Status>('rtl.getSimulationStatus');
  const records:Array<{root:string;compiler:string;status:string}>=[];
  async function results(root:string) {
    const directory=path.join(root,'.rtl/runs');
    let names:string[];
    try {names=await readdir(directory);} catch {return [];}
    return Promise.all(names.map(async name=>JSON.parse(await readFile(path.join(directory,name,'result.json'),'utf8'))));
  }
  async function runAt(home:string, root:string) {
    await settings.update('toolsDirectory',home,vscode.ConfigurationTarget.Global);
    await vscode.commands.executeCommand('rtl.refresh');
    const before=await results(root);
    const test=(await status()).tests.find(test=>test.name==='counter_basic' && path.resolve(test.root)===path.resolve(root));
    assert.ok(test);
    await vscode.commands.executeCommand('rtl.selectTarget',test.id);
    await vscode.commands.executeCommand('rtl.runTarget');
    assert.equal((await status()).phase,'completed');
    const previous=new Set(before.map(r=>r.directory));
    const added=(await results(root)).filter(r=>!previous.has(r.directory));
    assert.equal(added.length,1); assert.equal(added[0].status,'passed');
    const log=await readFile(added[0].log,'utf8');
    // Native compile output must use the selected tool environment, not merely display it.
    const compiler=path.join(home,'tools/msys64/ucrt64/share/verilator/include').replaceAll('\\','/');
    assert.ok(log.replaceAll('\\','/').toLowerCase().includes(compiler.toLowerCase()),`Compiler include path missing: ${compiler}\n${log.slice(0,1500)}`);
    records.push({root,compiler,status:added[0].status});
  }
  try {
    await settings.update('editor.semantic',false,vscode.ConfigurationTarget.Global);
    await runAt(homeA,folders[0].uri.fsPath);
    await runAt(homeB,folders[0].uri.fsPath);
    await vscode.commands.executeCommand('rtl.refresh');
    const tests=(await status()).tests;
    assert.equal(tests.length,4); assert.equal(new Set(tests.map(t=>t.id)).size,4);
    assert.equal(tests.filter(t=>t.name==='counter_basic').length,2);
    await runAt(homeB,folders[1].uri.fsPath);
    assert.equal((await results(folders[0].uri.fsPath)).length,2);
    assert.equal((await results(folders[1].uri.fsPath)).length,1);
    assert.deepEqual((await status()).active,[]);
    for(const folder of folders) {
      assert.deepEqual((await readdir(folder.uri.fsPath)).sort(),['.gitignore','.rtl','README.md','rtl','rtl.toml','tb'].sort());
    }
    const directory=path.join(folders[0].uri.fsPath,'.rtl'); await mkdir(directory,{recursive:true});
    await writeFile(path.join(directory,'extension-test.json'),JSON.stringify({passed:true,toolPaths:true,multiWorkspace:true,records},null,2));
    console.log('RTL_TOOL_PATHS_PASS: manual setting A/B, real build/run with semantic disabled, duplicate targets isolated');
  } finally {
    await settings.update('toolsDirectory',originalHome,vscode.ConfigurationTarget.Global);
    await settings.update('editor.semantic',originalSemantic,vscode.ConfigurationTarget.Global);
  }
}
