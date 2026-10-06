import * as vscode from 'vscode';
import { simulationSummary, type SimulationSnapshot } from './simulation-summary';
import { freshnessLabel } from './input-freshness';
export type { SimulationSnapshot } from './simulation-summary';
type Node = {label:string; description?:string; tooltip?:string; command?:string; args?:unknown[]; context?:string; icon?:string; targetId?:string};
/** Projection of the existing execution callbacks; owns no execution or tool state. */
export function registerSimulationUi(context: vscode.ExtensionContext, changed: vscode.Event<void>, snapshot:()=>SimulationSnapshot): { selectedIds(): string[] } {
  const provider: vscode.TreeDataProvider<Node> = {
    onDidChangeTreeData:changed,
    getChildren:()=>{
      const state = snapshot();
      return state.tests.map(test=>({
        targetId:test.id,label:test.name,
        description:[test.project,test.top,test.running?'Running':test.status,test.durationMs === undefined?'':`${(test.durationMs/1000).toFixed(2)}s`,freshnessLabel(test.freshness,test.unsaved)].filter(Boolean).join(' · '),
        tooltip:`${test.root}\nTop: ${test.top}${test.startedAt ? `\nLast run: ${test.startedAt}` : ''}${test.freshness?.message ? `\n${test.freshness.message}` : ''}${test.unsaved ? '\nUnsaved input edits are not included in the recorded run.' : ''}`,
        context:test.waveform?'rtlSimulationWaveform':'rtlSimulationTest',command:'rtl.selectTarget',args:[test.id],
        icon:test.running?'sync~spin':test.freshness?.state === 'changed'?'warning':test.status === 'passed'?'pass':test.status === 'failed'||test.status === 'timedOut'?'error':test.status === 'cancelled'?'debug-stop':'circuit-board'
      }));
    },
    getTreeItem:node=>{
      const item = new vscode.TreeItem(node.label); item.description=node.description; item.tooltip=node.tooltip;
      item.id=node.targetId;
      item.contextValue=node.context; if(node.icon) item.iconPath=new vscode.ThemeIcon(node.icon);
      if(node.command) item.command={command:node.command,title:node.label,arguments:node.args};
      return item;
    }
  };
  const bar=vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 20);
  const view=vscode.window.createTreeView('rtl.start',{treeDataProvider:provider,canSelectMany:true});
  const update=()=>{ const state=snapshot(), summary=simulationSummary(state); view.message=state.tests.length?summary:undefined; bar.text=`$(beaker) RTL: ${state.selected ?? 'Select test'} · ${summary.slice(0,80)}`; bar.tooltip=`${summary}\nOpen Simulation for targets, Run/Stop and results`; bar.command='rtl.start.focus'; bar.show(); };
  context.subscriptions.push(view,bar,changed(update)); update();
  return {selectedIds:()=> (view.selection ?? []).map(node=>node.targetId!).filter(Boolean)};
}
