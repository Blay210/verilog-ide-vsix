import path from 'node:path';
import {mkdir,mkdtemp,writeFile,readFile,symlink} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import './build.mjs';
const require=createRequire(import.meta.url);
const {createProject}=require('../packages/core/dist/index.js');
const code=process.env.VSCODE_EXECUTABLE, homeA=process.env.RTL_DEV_HOME;
if(!code || !homeA) throw Error('Set VSCODE_EXECUTABLE and RTL_DEV_HOME to existing VS Code and managed MSYS2 tools. No installer runs.');
await mkdir('.dev/remaining-validation',{recursive:true});
const root=await mkdtemp(path.resolve('.dev/remaining-validation/host-'));
const homeB=process.env.RTL_TEST_SECOND_HOME ? path.resolve(process.env.RTL_TEST_SECOND_HOME) : path.join(root,'tools-b');
if (!process.env.RTL_TEST_SECOND_HOME) {
  await mkdir(path.join(homeB,'tools'),{recursive:true});
  // Default: same existing binaries via another path; an optional independent home tests actual tool replacement.
  await symlink(path.join(path.resolve(homeA),'tools/msys64'),path.join(homeB,'tools/msys64'),'junction');
}
for(const folder of ['project-a','project-b']) await createProject(path.join(root,folder),true);
const workspace=path.join(root,'acceptance.code-workspace');
await writeFile(workspace,JSON.stringify({folders:[{path:'project-a'},{path:'project-b'}]}));
const suite=path.join(root,'suite.cjs');
await build({entryPoints:['tests/vscode/suite.ts'],outfile:suite,bundle:true,platform:'node',format:'cjs',external:['vscode']});
const env={...process.env,RTL_TOOLPATH_TEST:'1',RTL_TEST_HOME_A:path.resolve(homeA),RTL_TEST_HOME_B:homeB};
delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(code,[workspace,'--new-window','--disable-extensions','--disable-workspace-trust','--skip-welcome','--skip-release-notes','--user-data-dir',path.join(root,'profile'),'--extensions-dir',path.join(root,'extensions'),'--extensionDevelopmentPath='+path.resolve('packages/vscode'),'--extensionTestsPath='+suite],{env,windowsHide:true,stdio:'inherit'});
child.on('error',error=>{console.error(error);process.exitCode=1;});
child.on('exit',async code=>{
  process.exitCode=code??1;
  try {
    const receipt=JSON.parse(await readFile(path.join(root,'project-a/.rtl/extension-test.json'),'utf8'));
    if(receipt.passed!==true) process.exitCode=1;
  } catch {process.exitCode=1;console.error('Tool-path acceptance receipt missing.');}
  console.log('Tool-path acceptance artifacts:',root);
});
