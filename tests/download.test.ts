import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { downloadVerified } from '@rtl-dev/toolchain';

test('network failure can be retried with a verified download and no leftover partial file', async () => {
  const bytes=Buffer.from('retry-install-fixture');
  const hash=createHash('sha256').update(bytes).digest('hex');
  let requests=0;
  const server=createServer((req,res)=>{
    if(req.url==='/checksum') {res.end(hash);return;}
    if(++requests===1) {res.statusCode=503;res.end('temporarily unavailable');return;}
    res.end(bytes);
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  await mkdir('.dev/tests',{recursive:true});
  const root=await mkdtemp(path.resolve('.dev/tests/retry-')),file=path.join(root,'installer.exe');
  try {
    await assert.rejects(downloadVerified(url+'/installer',url+'/checksum',file),/HTTP 503/);
    await assert.rejects(access(file)); await assert.rejects(access(file+'.partial'));
    await downloadVerified(url+'/installer',url+'/checksum',file);
    assert.deepEqual(await readFile(file),bytes); assert.equal(requests,2);
    await assert.rejects(access(file+'.partial'));
  } finally {await new Promise<void>(resolve=>server.close(()=>resolve()));}
});

test('cancelling an active HTTP download removes its partial output and allows retry', async () => {
  const bytes=Buffer.alloc(256*1024,0x41);
  const hash=createHash('sha256').update(bytes).digest('hex');
  let slow=true, started!:()=>void;
  const active=new Promise<void>(resolve=>{started=resolve;});
  const server=createServer((req,res)=>{
    if(req.url==='/checksum') {res.end(hash);return;}
    if(!slow) {res.end(bytes);return;}
    res.write(bytes.subarray(0,1024)); started();
    // Keep the response open until cancellation closes the real HTTP socket.
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  await mkdir('.dev/tests',{recursive:true});
  const root=await mkdtemp(path.resolve('.dev/tests/active-download-')),file=path.join(root,'installer.exe');
  const abort=new AbortController();
  try {
    const downloading=downloadVerified(url+'/installer',url+'/checksum',file,{signal:abort.signal});
    const rejection=assert.rejects(downloading); // Attach before aborting to avoid an unhandled rejection.
    await active;
    // Wait until the implementation has opened its partial file, not just until headers arrived.
    const deadline=Date.now()+5000;
    while(true) {try {await access(file+'.partial');break;}catch {assert.ok(Date.now()<deadline);await new Promise(resolve=>setTimeout(resolve,10));}}
    abort.abort(); await rejection;
    await assert.rejects(access(file)); await assert.rejects(access(file+'.partial'));
    slow=false;
    await downloadVerified(url+'/installer',url+'/checksum',file);
    assert.deepEqual(await readFile(file),bytes);
  } finally {abort.abort();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});

test('installer download verifies bytes and removes corrupt partial downloads', async () => {
  const bytes = Buffer.from('installer-fixture');
  const hash = createHash('sha256').update(bytes).digest('hex');
  const server = createServer((req, res) => {
    if (req.url === '/good.sha256') res.end(hash + '  installer.exe');
    else if (req.url === '/bad.sha256') res.end('0'.repeat(64));
    else if (req.url === '/missing') { res.statusCode = 503; res.end(); }
    else res.end(bytes);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number }; const url = `http://127.0.0.1:${address.port}`;
  const base = path.resolve('.dev/tests'); await mkdir(base, { recursive: true });
  const root = await mkdtemp(path.join(base, 'download-')); const file = path.join(root, 'installer.exe');
  try {
    await downloadVerified(url + '/file', url + '/good.sha256', file);
    assert.deepEqual(await readFile(file), bytes);
    await assert.rejects(downloadVerified(url + '/file', url + '/bad.sha256', file + '.bad'), /SHA256 mismatch/);
    await assert.rejects(access(file + '.bad.partial'));
    await assert.rejects(downloadVerified(url + '/missing', url + '/good.sha256', file + '.missing'), /HTTP 503/);
    const controller = new AbortController(); controller.abort();
    await assert.rejects(downloadVerified(url + '/file', url + '/good.sha256', file + '.cancel', { signal: controller.signal }));
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
