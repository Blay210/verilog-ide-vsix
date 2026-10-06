import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createServer} from 'node:http';
import {mkdir,mkdtemp,readFile,access,readdir} from 'node:fs/promises';
import {configureToolsHome,WindowsMsys2Provider} from '@rtl-dev/toolchain';

test('fresh-store installer releases its lock after network failure, bad checksum and cancellation', {skip:process.platform!=='win32' || process.arch!=='x64'}, async()=>{
  await mkdir('.dev/tests',{recursive:true});
  const home=await mkdtemp(path.resolve('.dev/tests/install-recovery-'));
  configureToolsHome(home);
  const fetchOriginal=globalThis.fetch;
  let lookupFails=true;
  const official='https://github.com/msys2/msys2-installer/releases/download/2026-01-01/msys2-base-x86_64-20260101.sfx.exe';
  const server=createServer((req,res)=>{
    if(req.url==='/release') {
      if(lookupFails){res.statusCode=503;res.end('test outage');return;}
      res.setHeader('Content-Type','application/json');
      res.end(JSON.stringify([{tag_name:'2026-01-01',prerelease:false,assets:[{name:'msys2-base-x86_64-20260101.sfx.exe',browser_download_url:official}]}]));
    } else if(req.url==='/checksum') res.end('0'.repeat(64));
    else res.end('deliberately-invalid-installer-fixture');
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  const requests:string[]=[];
  // Route release/download HTTP to a local fixture. No installer can run: hash deliberately mismatches.
  globalThis.fetch=async(input,init)=>{
    const request=String(input);requests.push(request);
    assert.ok(request.startsWith('https://api.github.com/repos/msys2/') || request===official || request===official+'.sha256');
    return fetchOriginal(url+(request.includes('api.github.com')?'/release':request.endsWith('.sha256')?'/checksum':'/archive'),init);
  };
  const provider=new WindowsMsys2Provider();
  const plan={root:path.join(home,'tools/msys64'),bootstrap:true,packages:[],missing:['Verilator']};
  const unlocked=()=>assert.rejects(access(path.join(home,'install.lock')));
  try {
    await assert.rejects(provider.install(plan),/release lookup failed: HTTP 503/);await unlocked();
    lookupFails=false;
    await assert.rejects(provider.install(plan),/SHA256 mismatch/);await unlocked();
    assert.deepEqual(await readdir(path.join(home,'cache/downloads')),[]);
    await assert.rejects(access(path.join(plan.root,'usr/bin/bash.exe')));
    const count=requests.length;
    const abort=new AbortController();abort.abort();
    await assert.rejects(provider.install(plan,{signal:abort.signal}));await unlocked();
    assert.equal(requests.length,count,'Already-cancelled install must not contact the network');
    const log=await readFile(path.join(home,'install.log'),'utf8');
    assert.match(log,/HTTP 503/);assert.match(log,/SHA256 mismatch/);
    await assert.rejects(provider.install({...plan,root:path.join(home,'wrong-root')}),/managed tool directory/);
  } finally {
    globalThis.fetch=fetchOriginal;configureToolsHome();server.closeAllConnections();
    await new Promise<void>(resolve=>server.close(()=>resolve()));
  }
});
