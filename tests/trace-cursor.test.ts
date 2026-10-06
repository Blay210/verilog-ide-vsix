import test from 'node:test';
import assert from 'node:assert/strict';
import { TraceCursorHub, type TraceCursorState } from '@rtl-dev/waveform';
const identity={directory:'D:/recorded/project/.rtl/runs/a',runId:'00000000-0000-4000-8000-000000000001',inputFingerprint:'a'.repeat(64),traceSha256:'b'.repeat(64)};
const scale={magnitude:1,unit:'ps' as const};

test('shared cursor synchronizes exact ticks only within one recorded archive identity',()=>{
  const hub=new TraceCursorHub(),left:TraceCursorState[]=[],right:TraceCursorState[]=[];
  const a=hub.connect(identity,'90071992547409940',scale,state=>left.push(state));
  const b=hub.connect({...identity},'90071992547409940',scale,state=>right.push(state));
  const isolated=[{...identity,directory:'D:/other/project/.rtl/runs/a'},{...identity,runId:'00000000-0000-4000-8000-000000000002'},{...identity,inputFingerprint:'c'.repeat(64)},{...identity,traceSha256:'d'.repeat(64)}].map(id=>hub.connect(id,'90071992547409940',scale,()=>assert.fail('Other trace received a cursor')));
  a.set('90071992547409939');assert.equal(b.read().time,'90071992547409939');assert.equal(right.length,1);
  b.set('0005');assert.equal(a.read().time,'5');assert.equal(a.read().revision,2);
  a.set('5');assert.equal(left.length,2);
  const state=a.read();state.time='99';assert.equal(a.read().time,'5');
  assert.ok(isolated.every(connection=>connection.read().time==='0'));
  assert.throws(()=>a.set('90071992547409941'),/end time/);
  for(const time of ['-1','1.5','1e3','9'.repeat(41)])assert.throws(()=>a.set(time),/Invalid/);
  a.dispose();assert.throws(()=>a.set('0'),/available/);b.set('6');assert.equal(left.length,2);
  b.dispose();isolated.forEach(connection=>connection.dispose());
  const fresh=hub.connect(identity,'90071992547409940',scale,()=>{});assert.equal(fresh.read().time,'0');fresh.dispose();
});

test('trace invalidation blocks every old view without reviving a replaced group',()=>{
  const hub=new TraceCursorHub(),states:TraceCursorState[]=[];
  const a=hub.connect(identity,'0',scale,()=>{throw Error('Closed renderer');});
  const b=hub.connect(identity,'0',scale,state=>states.push(state));
  a.set('0');assert.throws(()=>a.set('1'),/end time/);
  a.invalidate('Retained sources changed');assert.equal(states.at(-1)!.state,'unavailable');
  assert.equal(b.read().reason,'Retained sources changed');assert.throws(()=>b.set('0'),/available/);
  const fresh=hub.connect(identity,'0',scale,()=>{});a.dispose();b.dispose();
  const peer=hub.connect(identity,'0',scale,()=>{});fresh.invalidate('Trace replaced');
  assert.equal(peer.read().state,'unavailable');fresh.dispose();peer.dispose();
});

test('cursor rejects conflicting metadata and suppresses obsolete reentrant broadcasts',()=>{
  const hub=new TraceCursorHub();let invalidated=false;
  const a=hub.connect(identity,'10',scale,state=>{if(state.state==='ready'&&!invalidated){invalidated=true;a.invalidate('Changed during update');}});
  const seen:TraceCursorState[]=[];const b=hub.connect(identity,'10',scale,state=>seen.push(state));
  assert.throws(()=>hub.connect(identity,'11',scale,()=>{}),/Conflicting/);
  assert.throws(()=>hub.connect(identity,'10',{magnitude:10,unit:'ps'},()=>{}),/Conflicting/);
  assert.throws(()=>hub.connect({...identity,traceSha256:''},'10',scale,()=>{}),/identity/);
  assert.throws(()=>hub.connect(identity,'10',{magnitude:2,unit:'ps'},()=>{}),/timescale/);
  a.set('5');assert.deepEqual(seen.map(s=>s.state),['unavailable']);
  assert.equal(b.read().revision,2);a.dispose();b.dispose();
});

test('cursor view/group limits release capacity when views close',()=>{
  const hub=new TraceCursorHub();
  const members=Array.from({length:16},()=>hub.connect(identity,'10',scale,()=>{}));
  assert.throws(()=>hub.connect(identity,'10',scale,()=>{}),/Too many/);
  members[0].dispose();const replacement=hub.connect(identity,'10',scale,()=>{});
  const others=Array.from({length:15},(_,i)=>hub.connect({...identity,directory:`D:/project-${i}`},'10',scale,()=>{}));
  assert.throws(()=>hub.connect({...identity,directory:'D:/overflow'},'10',scale,()=>{}),/Close another/);
  others[0].dispose();const fresh=hub.connect({...identity,directory:'D:/overflow'},'10',scale,()=>{});
  members.forEach(member=>member.dispose());others.forEach(member=>member.dispose());replacement.dispose();fresh.dispose();
});
