import test from 'node:test';
import assert from 'node:assert/strict';
import { simulationSummary, type SimulationSnapshot } from '../packages/vscode/src/simulation-summary';
const base:SimulationSnapshot={phase:'ready',tests:[],targets:[],active:[],statuses:[]};
test('simulation UI distinguishes setup, denial, cancellation and result types',()=>{
  assert.match(simulationSummary(base),/No tests/);
  assert.match(simulationSummary({...base,phase:'blocked',message:'Tools not ready; no tests ran'}),/Not run.*Tools not ready/);
  assert.match(simulationSummary({...base,phase:'error',message:'Save failed'}),/setup failed.*Save failed/);
  assert.equal(simulationSummary({...base,phase:'completed',statuses:['passed','failed','timedOut','cancelled']}),'Last run · 1 passed · 1 failed · 1 timedOut · 1 cancelled');
  assert.match(simulationSummary({...base,phase:'cancelled',statuses:['passed']}),/Cancelled.*1 passed/);
  assert.equal(simulationSummary({...base,phase:'running',targets:['p/a','p/b'],active:['p/b'],statuses:['passed']}),'Running 1/2 · p/b');
});
