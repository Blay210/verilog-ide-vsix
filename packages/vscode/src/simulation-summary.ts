import type { Freshness } from './input-freshness';
export interface SimulationSnapshot {
  phase: 'ready' | 'preparing' | 'running' | 'cancelling' | 'completed' | 'cancelled' | 'blocked' | 'error';
  message?: string; targets: string[]; active: string[]; statuses: string[];
  selected?: string; tests: {id:string; name:string; project:string; root:string; top:string; selected:boolean; running?:boolean; status?:string; durationMs?:number; waveform?:boolean; startedAt?:string; freshness?:Freshness; unsaved?:boolean}[];
  latest?: {name:string; status:string; durationMs:number; message?:string};
  canStop?: boolean;
}
export function simulationSummary(state: SimulationSnapshot): string {
  const counts = ['passed','failed','timedOut','cancelled'].map(status=>{
    const count = state.statuses.filter(s=>s === status).length;
    return count ? `${count} ${status}` : '';
  }).filter(Boolean).join(' · ');
  if (state.phase === 'running') return `Running ${state.statuses.length}/${state.targets.length} · ${state.active.join(', ') || 'Preparing next test'}`;
  if (state.phase === 'completed') return `Last run · ${counts || 'Completed'}`;
  if (state.phase === 'cancelled') return `Cancelled · ${counts || 'No tests completed'}`;
  if (state.phase === 'ready') return state.tests.length ? 'Ready · Select a test below' : 'No tests · Create or open an RTL project';
  return {preparing:'Preparing simulation',cancelling:'Stopping simulation',blocked:'Not run',error:'Simulation setup failed'}[state.phase] + (state.message ? ` · ${state.message}` : '');
}
