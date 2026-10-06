import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const compiled = build({ entryPoints: ['packages/vscode/src/extension.ts'], bundle: true, platform: 'node', format: 'cjs', write: false, external: ['vscode', '@rtl-dev/core', '@rtl-dev/toolchain', '@rtl-dev/verilator'] });
const disposable = () => ({ dispose() {} });

interface CacheScenario {
  run(): Promise<unknown>;
  runCurrent(): Promise<unknown>;
  runFile(file: string, scheme?: string): Promise<unknown>;
  pickIndex?: number | null;
  extraTest?: boolean;
  selectedIds: string[];
  executedTargets: string[];
  runSelection(names: string[]): Promise<unknown>;
  focus(file?: string, scheme?: string): void;
  currentTestbench(): unknown;
  sources: string[];
  change(directory: string, setting?: string): void;
  verified: string[];
  executed: string[];
  onVerify?: () => Promise<void>;
  onInstall?: () => Promise<void>;
  onRun?: () => Promise<void>;
}
async function harness(options: { approve: boolean; trusted?: boolean; failFirst?: boolean; semantic?: boolean; structure?: boolean; simulation?: boolean; cancelPreparation?: boolean; cache?: (scenario: CacheScenario) => Promise<void> }) {
  const commands = new Map<string, (...args: unknown[]) => Promise<unknown>>();
  let installs = 0, confirmations = 0;
  let home = 'D:/rtl-tools';
  const contexts = new Map<string, unknown>();
  const editorListeners: Array<() => void> = [];
  const listeners: Array<(event: { affectsConfiguration(key: string): boolean }) => void> = [];
  const scenario: CacheScenario = {
    run: async () => commands.get('rtl.runAll')!(),
    runCurrent: async () => commands.get('rtl.runCurrent')!(),
    runFile: async (file,scheme='file') => commands.get('rtl.runFile')!({...uri(file),scheme}),
    runSelection: async names => { scenario.selectedIds=names.map(name=>`${uri('D:/fixture').toString()}#${name}`); return commands.get('rtl.runSimulationSelection')!(); },
    selectedIds:[], executedTargets:[],
    focus(file, scheme = 'file') {
      vscode.window.activeTextEditor = file ? { document: { uri: { ...uri(file), scheme }, languageId: 'systemverilog' }, selections: [] } : undefined;
      editorListeners.forEach(listener => listener());
    },
    currentTestbench: () => contexts.get('rtl.currentTestbench'),
    sources: ['D:/fixture/tb/test.sv'],
    change(directory, setting = 'rtl.toolsDirectory') {
      if (setting === 'rtl.toolsDirectory') home = directory;
      listeners.forEach(listener => listener({ affectsConfiguration: key => key === setting }));
    },
    verified: [], executed: []
  };
  class EventEmitter { event = () => disposable(); fire() {} dispose() {} }
  const uri=(fsPath:string)=>({scheme:'file',fsPath,toString:()=>`file:///${fsPath}`});
  const vscode = {
    EventEmitter, StatusBarAlignment: { Right: 2 },
    languages: { registerCompletionItemProvider: disposable, registerCodeActionsProvider: disposable },
    CodeActionKind: { RefactorRewrite: 'refactor.rewrite' },
    Uri:{file:uri,joinPath:(root:{fsPath:string},...parts:string[])=>uri(`${root.fsPath}/${parts.join('/')}`)},
    TestRunRequest:class {constructor(public include?:unknown[]){}},
    window: {
      activeTextEditor: undefined as { document: { uri: { fsPath: string; scheme: string; toString(): string }; languageId: string }; selections: unknown[] } | undefined,
      createOutputChannel: () => ({ append() {}, appendLine() {}, show() {}, dispose() {} }),
      createTreeView: () => ({...disposable(),get selection(){return scenario.selectedIds.map(targetId=>({targetId}));}}),
      createStatusBarItem: () => ({ show() {}, hide() {}, dispose() {} }),
      onDidChangeActiveTextEditor: (listener: () => void) => { editorListeners.push(listener); return disposable(); }, onDidChangeTextEditorSelection: disposable,
      registerCustomEditorProvider: disposable,
      showQuickPick: async (items:any[]) => items[0]?.entry ? scenario.pickIndex === null ? undefined : items[scenario.pickIndex ?? 0] : ({ action: 'install' }),
      showInformationMessage: async (_message: string, opts: { modal?: boolean }) => { if (opts?.modal) { confirmations++; return options.approve ? 'Install' : undefined; } },
      showErrorMessage: async () => options.failFirst && installs === 1 ? 'Retry' : undefined,
      withProgress: async (_options: unknown, task: (progress: unknown, token: unknown) => Promise<unknown>) => task({ report() {} }, { onCancellationRequested: disposable })
    },
    workspace: {
      registerTextDocumentContentProvider: disposable,
      isTrusted: options.trusted ?? true, workspaceFolders: options.simulation ? [{uri:uri('D:/fixture'),name:'fixture'}] : [],
      fs:{stat:async()=>({})},saveAll:async()=>true,
      getConfiguration: () => ({ get: (key: string) => key === 'toolsDirectory' ? home : '' }),
      createFileSystemWatcher: () => ({ onDidCreate: disposable, onDidChange: disposable, onDidDelete: disposable, dispose() {} }),
      onDidChangeWorkspaceFolders: disposable,
      onDidChangeTextDocument: disposable, onDidCloseTextDocument: disposable, onDidSaveTextDocument: disposable,
      onDidGrantWorkspaceTrust: disposable,
      onDidChangeConfiguration: (listener: typeof listeners[number]) => { listeners.push(listener); return disposable(); }
    },
    tests: { createTestController: () => ({ items: { size: 0, replace() {} }, createRunProfile() {}, dispose() {},
      createTestItem:(id:string)=>({id,children:{add(){},forEach(){} }}),
      createTestRun:()=>({token:{onCancellationRequested:disposable},enqueued(){},started(){},passed(){},appendOutput(){},skipped(){},end(){}})
    }) },
    commands: { registerCommand: (id: string, handler: (...args: unknown[]) => Promise<unknown>) => { commands.set(id, handler); return disposable(); }, executeCommand: (id: string, ...args: unknown[]) => { if(id==='setContext') {contexts.set(args[0] as string,args[1]); return;} return commands.get(id)?.(...args); } },
    TestRunProfileKind: { Run: 1 }, ProgressLocation: { Notification: 1 }
  };
  const mocks: Record<string, unknown> = {
    vscode,
    '@rtl-dev/core': {
      loadProject:async()=>({root:'D:/fixture',name:'fixture',backend:'verilator',tests:[{name:'test',top:'top',sources:[...scenario.sources] },...(scenario.extraTest?[{name:'second',top:'second_top',sources:[...scenario.sources]}]:[])]}),
      readHistory:async()=>[],
      runTests:async (_project: unknown, targets: Array<{name:string}>, backend:{tools:{compiler:string}}, opts: {onStart(target:unknown):void;onResult(result:unknown):void}) => {
        scenario.executed.push(backend.tools.compiler);
        scenario.executedTargets.push(...targets.map(target=>target.name));
        await scenario.onRun?.();
        for(const target of targets) { opts.onStart(target); opts.onResult({name:target.name,status:'passed',directory:'D:/fixture/.rtl/run',durationMs:1}); }
      }
    }, '@rtl-dev/verilator': { VerilatorBackend: class { constructor(public tools: {compiler:string}) {} } },
    '@rtl-dev/toolchain': {
      configureToolsHome() {}, toolsHome: () => home,
      semanticRoot: () => 'D:/rtl-tools/slang',
      installSemanticRuntime: async () => { installs++; if (options.failFirst && installs === 1) throw Error('Network unavailable'); return 'D:/rtl-tools/slang/python.exe'; },
      detectTools: async () => ({ missing: options.cancelPreparation || options.cache && home !== 'missing' ? [] : ['Verilator'],toolchain:options.cache && home !== 'missing' ? {compiler:home} : options.cancelPreparation ? {compiler:'fixture'} : undefined }),
      verifyToolchain:async (tools:{compiler:string}, opts:{signal:AbortSignal})=>{
        if(options.cache) { scenario.verified.push(tools.compiler); await scenario.onVerify?.(); }
        else { await commands.get('rtl.stopSimulation')!(); opts.signal.throwIfAborted(); }
      },
      WindowsMsys2Provider: class {
        async plan() { return { root: 'D:/rtl-tools', missing: ['Verilator'], packages: ['verilator'] }; }
        async install() { const compiler=home; installs++; await scenario.onInstall?.(); if (options.failFirst && installs === 1) throw Error('Network unavailable'); return { description: 'verified toolchain', compiler }; }
      }
    }
  };
  const source = (await compiled).outputFiles[0].text;
  const module = { exports: {} as { activate: (ctx: unknown) => void } };
  const require = createRequire(import.meta.url);
  vm.runInNewContext(source, { module, exports: module.exports, require: (id: string) => mocks[id] ?? require(id), AbortController, AbortSignal, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {}, process });
  module.exports.activate({ subscriptions: [], asAbsolutePath: (file: string) => file });
  if(options.cache) await options.cache(scenario);
  else await commands.get(options.simulation ? 'rtl.runAll' : options.structure ? 'rtl.showStructure' : options.semantic ? 'rtl.setupLanguage' : 'rtl.toolchain')!();
  return { installs, confirmations, ...(options.simulation ? {status:await commands.get('rtl.getSimulationStatus')!()} : {}) };
}

test('GUI refusal does not install any tools', async () => assert.deepEqual(await harness({ approve: false }), { installs: 0, confirmations: 1 }));
test('GUI approval invokes the installer once', async () => assert.deepEqual(await harness({ approve: true }), { installs: 1, confirmations: 1 }));
test('GUI installation error allows retry with a fresh plan and confirmation', async () => assert.deepEqual(await harness({ approve: true, failFirst: true }), { installs: 2, confirmations: 2 }));
test('untrusted workspaces cannot install tools', async () => assert.deepEqual(await harness({ approve: true, trusted: false }), { installs: 0, confirmations: 0 }));
test('language setup refusal does not install a runtime', async () => assert.deepEqual(await harness({ approve: false, semantic: true }), { installs: 0, confirmations: 1 }));
test('language setup approval installs once', async () => assert.deepEqual(await harness({ approve: true, semantic: true }), { installs: 1, confirmations: 1 }));
test('language setup network failure can be retried after confirmation', async () => assert.deepEqual(await harness({ approve: true, semantic: true, failFirst: true }), { installs: 2, confirmations: 2 }));
test('untrusted workspaces cannot install language tools', async () => assert.deepEqual(await harness({ approve: true, semantic: true, trusted: false }), { installs: 0, confirmations: 0 }));

test('untrusted workspaces cannot elaborate design structure', async () => assert.deepEqual(await harness({ approve: true, trusted: false, structure: true }), { installs: 0, confirmations: 0 }));
test('simulation install refusal is shown as not run, with no fabricated result',async()=>{
  const result=await harness({approve:false,simulation:true});
  assert.equal(result.installs,0); assert.equal(result.confirmations,1);
  const status=result.status as {phase:string;statuses:string[];message:string};
  assert.equal(status.phase,'blocked'); assert.match(status.message,/no tests ran/); assert.deepEqual(Array.from(status.statuses),[]);
});

test('current test context follows editor focus and refreshed manifest sources', async () => {
  await harness({approve:false,simulation:true,cache:async s=>{
    await s.run();
    s.focus('D:/fixture/tb/test.sv'); assert.equal(s.currentTestbench(),true);
    if(process.platform==='win32') { s.focus('d:/FIXTURE/tb/TEST.sv'); assert.equal(s.currentTestbench(),true); }
    s.focus('D:/fixture/rtl/dut.sv'); assert.equal(s.currentTestbench(),false);
    s.focus('D:/fixture/tb/test.sv','rtl-recorded'); assert.equal(s.currentTestbench(),false);
    s.focus(); assert.equal(s.currentTestbench(),false);
    s.focus('D:/fixture/tb/test.sv');
    s.sources=[]; await s.run(); assert.equal(s.currentTestbench(),false);
    s.sources=['D:/fixture/tb/test.sv']; await s.run(); assert.equal(s.currentTestbench(),true);
  }});
});

test('current test command runs a matching TB but does not run a DUT or recorded source', async () => {
  await harness({approve:false,simulation:true,cache:async s=>{
    s.focus('D:/fixture/rtl/dut.sv'); await s.runCurrent(); assert.equal(s.executed.length,0);
    s.focus('D:/fixture/tb/test.sv','rtl-recorded'); await s.runCurrent(); assert.equal(s.executed.length,0);
    s.focus('D:/fixture/tb/test.sv'); await s.runCurrent(); assert.deepEqual(s.executed,['D:/rtl-tools']);
  }});
});

test('Explorer execution uses the requested testbench instead of the active editor, and refuses unregistered sources', async () => {
  await harness({approve:false,simulation:true,cache:async s=>{
    s.focus('D:/fixture/rtl/dut.sv');
    await s.runFile('D:/fixture/tb/test.sv'); assert.equal(s.executed.length,1);
    await s.runFile('D:/fixture/rtl/dut.sv'); await s.runFile('D:/fixture/tb/test.sv','rtl-recorded'); assert.equal(s.executed.length,1);
    s.extraTest=true; s.pickIndex=null;
    await s.runFile('D:/fixture/tb/test.sv'); assert.equal(s.executed.length,1,'Cancelling the configuration picker must not run anything');
    s.pickIndex=1; await s.runFile('D:/fixture/tb/test.sv'); assert.equal(s.executed.length,2);
    assert.equal(s.executedTargets.at(-1),'second');
  }});
});

test('Simulation multi-selection executes exactly selected identities and rejects a removed target', async () => {
  await harness({approve:false,simulation:true,cache:async s=>{
    s.extraTest=true; await s.runSelection(['second']); assert.deepEqual(s.executedTargets,['second']);
    await s.runSelection(['test','second']); assert.deepEqual(s.executedTargets,['second','test','second']);
    s.extraTest=false; await s.runSelection(['second']); assert.deepEqual(s.executedTargets,['second','test','second']);
  }});
});
test('stopping during tool verification reports cancellation instead of setup failure',async()=>{
  const result=await harness({approve:false,simulation:true,cancelPreparation:true});
  const status=result.status as {phase:string;statuses:string[]};
  assert.equal(status.phase,'cancelled'); assert.deepEqual(Array.from(status.statuses),[]);
  assert.equal(result.installs,0);
});

test('manual tool settings changes reverify the next run; unrelated settings preserve reuse', async () => {
  await harness({approve:false,simulation:true,cache:async s=>{
    await s.run(); await s.run(); s.change('', 'rtl.editor.templates'); await s.run();
    assert.deepEqual(s.verified,['D:/rtl-tools']);
    s.change('D:/new-tools'); await s.run(); await s.run();
    assert.deepEqual(s.verified,['D:/rtl-tools','D:/new-tools']);
    assert.deepEqual(s.executed,['D:/rtl-tools','D:/rtl-tools','D:/rtl-tools','D:/new-tools','D:/new-tools']);
  }});
});

test('a settings change during verification cannot cache the obsolete toolchain', async () => {
  await harness({approve:false,simulation:true,cache:async s=>{
    s.onVerify=async()=>{ s.onVerify=undefined; s.change('D:/new-tools'); };
    await s.run(); await s.run(); await s.run();
    assert.deepEqual(s.verified,['D:/rtl-tools','D:/new-tools']);
    assert.deepEqual(s.executed,['D:/rtl-tools','D:/new-tools','D:/new-tools']);
  }});
});

test('a settings change during a simulation preserves its tools and rechecks the next run', async () => {
  await harness({approve:false,simulation:true,cache:async s=>{
    s.onRun=async()=>{s.onRun=undefined;s.change('D:/new-tools');};
    await s.run(); await s.run();
    assert.deepEqual(s.executed,['D:/rtl-tools','D:/new-tools']);
    assert.deepEqual(s.verified,['D:/rtl-tools','D:/new-tools']);
  }});
});

test('refusing installation after a manual switch does not reuse old verified tools', async () => {
  const result=await harness({approve:false,simulation:true,cache:async s=>{
    await s.run(); s.change('missing'); await s.run();
    assert.deepEqual(s.executed,['D:/rtl-tools']);
  }});
  assert.equal(result.installs,0); assert.equal(result.confirmations,1);
  assert.equal((result.status as {phase:string}).phase,'blocked');
});

test('a settings change during approved installation cannot cache the obsolete toolchain', async () => {
  const result=await harness({approve:true,simulation:true,cache:async s=>{
    s.change('missing');
    s.onInstall=async()=>{ s.onInstall=undefined; s.change('D:/new-tools'); };
    await s.run(); await s.run(); await s.run();
    assert.deepEqual(s.executed,['missing','D:/new-tools','D:/new-tools']);
    assert.deepEqual(s.verified,['D:/new-tools']);
  }});
  assert.equal(result.installs,1); assert.equal(result.confirmations,1);
});
