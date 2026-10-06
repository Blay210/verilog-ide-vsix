import test from 'node:test';
import assert from 'node:assert/strict';
import { targetsForFile } from '../packages/vscode/src/testbench-targets';
import { readFileSync } from 'node:fs';

test('testbench file matching preserves multiple configurations and excludes inferred and archived files', () => {
  const source = 'D:/한글 프로젝트/tb/tb counter.sv';
  const entries = [{id:'one',target:{sources:[source]}},{id:'two',target:{sources:[source]}}];
  assert.deepEqual(targetsForFile(entries,{scheme:'file',fsPath:source}),entries);
  assert.equal(targetsForFile(entries,{scheme:'file',fsPath:'D:/한글 프로젝트/tb/tb_other.sv'}).length,0);
  assert.equal(targetsForFile(entries,{scheme:'rtl-recorded',fsPath:source}).length,0);
  if(process.platform==='win32') assert.equal(targetsForFile(entries,{scheme:'file',fsPath:source.toUpperCase()}).length,2);
});

test('simulation contributions move execution out of Explorer and restrict file actions to registered test sources', () => {
  const {contributes:c}=JSON.parse(readFileSync('packages/vscode/package.json','utf8'));
  assert.ok(c.viewsContainers.activitybar.some((v:any)=>v.id==='rtl-simulation'));
  for(const container of c.viewsContainers.activitybar) assert.match(container.id,/^[a-zA-Z0-9_-]+$/,'Custom container IDs must follow the host schema');
  assert.deepEqual(c.views['rtl-simulation'].map((v:any)=>v.id),['rtl.start','rtl.results']);
  assert.ok(!c.views.explorer.some((v:any)=>v.id==='rtl.start'));
  for(const menu of ['explorer/context','editor/title']) assert.match(c.menus[menu].find((m:any)=>m.command==='rtl.runFile').when,/resource in rtl.testbenchUris/);
  assert.ok(c.menus['view/item/context'].some((m:any)=>m.command==='rtl.runSimulationTest'&&m.group==='inline@1'));
});
