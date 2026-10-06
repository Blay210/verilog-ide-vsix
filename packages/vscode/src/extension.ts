import * as vscode from 'vscode';
import path from 'node:path';
import { loadProject, createProject, runTests, readHistory, compareResultInputs, compareConfiguredResultInputs, prepareProject, type Project, type TestTarget, type TestResult, type Toolchain } from '@rtl-dev/core';
import { SlangProvider } from '@rtl-dev/semantic';
import { VerilatorBackend } from '@rtl-dev/verilator';
import { detectTools, detectSemanticRuntime, verifyToolchain, WindowsMsys2Provider, GtkWaveProvider, toolsHome, configureToolsHome } from '@rtl-dev/toolchain';
import { registerRecordedSources } from './recorded-source';
import { registerEditor } from './editor';
import { registerSemantic } from './semantic';
import { registerStructure } from './structure';
import { registerWaveform } from './waveform';
import { registerSimulationUi, type SimulationSnapshot } from './simulation-ui';
import { RecordedTraceLinks } from './trace-links';
import { targetsForFile } from './testbench-targets';
import { InputFreshness, affectsEntry } from './input-freshness';

interface Entry { project: Project; target: TestTarget; item: vscode.TestItem }
interface ResultEntry { result: TestResult; project: Project }

export function activate(context: vscode.ExtensionContext): void {
  registerEditor(context);
  const output = vscode.window.createOutputChannel('RTL Dev');
  const controller = vscode.tests.createTestController('rtl-dev', 'RTL Tests');
  const changes = new vscode.EventEmitter<void>();
  let entries = new Map<string, Entry>();
  const currentTestEntries = () => {
    const document = vscode.window.activeTextEditor?.document;
    if (!document || document.uri.scheme !== 'file') return [];
    const normalized = (file: string) => process.platform === 'win32' ? path.resolve(file).toLowerCase() : path.resolve(file);
    return [...entries.values()].filter(entry => entry.target.sources.some(file => normalized(file) === normalized(document.uri.fsPath)));
  };
  const updateCurrentTestContext = () => { void vscode.commands.executeCommand('setContext', 'rtl.currentTestbench', currentTestEntries().length > 0); };
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateCurrentTestContext));
  updateCurrentTestContext();
  const results = new Map<string, ResultEntry>();
  const latestForTarget = (entry: Entry) => [...results.values()].filter(value => value.project.root === entry.project.root && value.result.name === entry.target.name).sort((a, b) => (b.result.startedAt ?? '').localeCompare(a.result.startedAt ?? ''))[0];
  const freshness = new InputFreshness(compareConfiguredResultInputs, () => changes.fire());
  const freshnessEntries = () => [...entries].map(([id, entry]) => ({id, ...entry, result:latestForTarget(entry)?.result}));
  const refreshFreshness = () => freshness.refresh(freshnessEntries(), vscode.workspace.isTrusted);
  context.subscriptions.push(freshness);
  registerRecordedSources(context);

  let busy = false;
  let verified: Toolchain | undefined;
  let toolsGeneration = 0;
  configureToolsHome(vscode.workspace.getConfiguration('rtl').get<string>('toolsDirectory'));
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
    if (!event.affectsConfiguration('rtl.toolsDirectory')) return;
    configureToolsHome(vscode.workspace.getConfiguration('rtl').get<string>('toolsDirectory'));
    toolsGeneration++;
    verified = undefined;
  }));
  registerSemantic(context);
  const traceLinks = new RecordedTraceLinks(context.asAbsolutePath('dist/waveform-worker.cjs'));
  const traceWatcher = vscode.workspace.createFileSystemWatcher('**/*');
  const traceChanged = (uri: vscode.Uri) => { if (uri.scheme === 'file') traceLinks.changed(uri.fsPath); };
  context.subscriptions.push(traceLinks, traceWatcher, traceWatcher.onDidCreate(traceChanged), traceWatcher.onDidChange(traceChanged), traceWatcher.onDidDelete(traceChanged));
  registerStructure(context, traceLinks);
  const openWaveform = registerWaveform(context, async file => {
    trusted();
    const detected = await detectTools();
    const viewer = detected.viewer ?? (await installTools())?.viewer;
    if (viewer) await new GtkWaveProvider(viewer).open(file);
  }, traceLinks);
  const activeOperations = new Set<AbortController>();
  const simulations = new Set<AbortController>();
  let selectedId: string | undefined;
  const presentation = {phase:'ready' as SimulationSnapshot['phase'],message:undefined as string | undefined,targets:[] as string[],active:new Set<string>(),statuses:[] as TestResult['status'][]};
  const latestResult = () => { const selected=selectedId && entries.get(selectedId); return [...results.values()].filter(value=>!selected || value.project.root === selected.project.root && value.result.name === selected.target.name).sort((a,b)=>(b.result.startedAt ?? '').localeCompare(a.result.startedAt ?? ''))[0]; };
  const simulationSnapshot = (): SimulationSnapshot => ({
    phase:presentation.phase,message:presentation.message,targets:[...presentation.targets],active:[...presentation.active].map(id=>{const e=entries.get(id)!;return `${e.project.name} / ${e.target.name}`;}),
    statuses:[...presentation.statuses],
    selected:selectedId && entries.get(selectedId) ? `${entries.get(selectedId)!.project.name} / ${entries.get(selectedId)!.target.name}` : undefined,
    tests:[...entries].map(([id,e])=>{ const result=latestForTarget(e)?.result; const unsaved=(vscode.workspace.textDocuments ?? []).some(document=>document.isDirty && document.uri.scheme === 'file' && affectsEntry({id,...e,result},document.uri.fsPath)); return {id,name:e.target.name,project:e.project.name,root:e.project.root,top:e.target.top,selected:id === selectedId,running:presentation.active.has(id),status:result?.status,durationMs:result?.durationMs,waveform:!!result?.waveform,startedAt:result?.startedAt,freshness:freshness.get(id),unsaved}; }),
    latest:latestResult()?.result,canStop:simulations.size > 0
  });
  const simulationUi = registerSimulationUi(context,changes.event,simulationSnapshot);
  const resultProvider: vscode.TreeDataProvider<ResultEntry> = {
    onDidChangeTreeData: changes.event,
    getChildren: () => [...results.values()].sort((a, b) => (b.result.startedAt ?? '').localeCompare(a.result.startedAt ?? '')),
    getTreeItem: value => {
      const { result, project } = value;
      const item = new vscode.TreeItem(`${result.name} — ${result.status}`);
      item.description = `${project.name} · ${result.startedAt ? new Date(result.startedAt).toLocaleString() : ''} · ${(result.durationMs / 1000).toFixed(2)}s`;
      item.tooltip = result.message ?? result.log;
      item.contextValue = result.waveform ? 'rtlResultWaveform' : 'rtlResult';
      item.iconPath = new vscode.ThemeIcon(result.status === 'passed' ? 'pass' : result.status === 'cancelled' ? 'debug-stop' : 'error');
      item.command = { command: 'rtl.resultActions', title: 'Result actions', arguments: [value] };
      return item;
    }
  };
  const tree = vscode.window.createTreeView('rtl.results', { treeDataProvider: resultProvider });
  context.subscriptions.push(output, controller, changes, tree, { dispose: () => activeOperations.forEach(c => c.abort()) });
  const report = (error: unknown) => { output.appendLine(String(error)); void vscode.window.showErrorMessage(String(error), 'Show Log').then(choice => { if (choice) output.show(); }); };
  const trusted = () => { if (!vscode.workspace.isTrusted) throw Error('Trust this workspace before running RTL code or installing tools.'); };

  let refreshGeneration = 0;
  async function refresh(force = false): Promise<void> {
    if (busy && !force) return;
    const generation = ++refreshGeneration;
    const next = new Map<string, Entry>();
    const roots: vscode.TestItem[] = [];
    const history = new Map<string, ResultEntry>();
    for (const folder of vscode.workspace.workspaceFolders ?? []) {
      const manifest = vscode.Uri.joinPath(folder.uri, 'rtl.toml');
      try { await vscode.workspace.fs.stat(manifest); } catch { continue; }
      try {
        const project = await loadProject(folder.uri.fsPath);
        const root = controller.createTestItem(folder.uri.toString(), project.name, manifest);
        for (const target of project.tests) {
          const id = `${folder.uri.toString()}#${target.name}`;
          const item = controller.createTestItem(id, target.name, vscode.Uri.file(target.sources[0]));
          item.description = [target.top, ...(target.tags ?? [])].join(' · ');
          item.tags = (target.tags ?? []).map(tag => new vscode.TestTag(tag));
          root.children.add(item); next.set(id, { project, target, item });
        }
        roots.push(root);
        try { for (const result of await readHistory(project.root)) history.set(result.directory, { result, project }); }
        catch (error) { output.appendLine(String(error)); }
      } catch (error) {
        const root = controller.createTestItem(folder.uri.toString(), folder.name, manifest);
        root.error = String(error); roots.push(root); output.appendLine(String(error));
      }
    }
    if (generation === refreshGeneration) { controller.items.replace(roots); entries = next; updateCurrentTestContext(); void vscode.commands.executeCommand('setContext', 'rtl.testbenchUris', [...new Set([...entries.values()].flatMap(e => e.target.sources.map(file => vscode.Uri.file(file).toString())))]); if(selectedId && !entries.has(selectedId)) selectedId=undefined; results.clear(); history.forEach((value, key) => results.set(key, value)); refreshFreshness(); changes.fire(); }
  }
  controller.refreshHandler = () => refresh();

  async function withProgress<T>(title: string, task: (signal: AbortSignal, log: (text: string) => void) => Promise<T>, parent?: AbortSignal): Promise<T> {
    return vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title, cancellable: true }, async (progress, token) => {
      const abort = new AbortController(); activeOperations.add(abort);
      const subscription = token.onCancellationRequested(() => abort.abort());
      try {
        const signal = parent ? AbortSignal.any([parent, abort.signal]) : abort.signal;
        signal.throwIfAborted();
        return await task(signal, text => { output.append(text); const line = text.trim().split(/\r?\n/).at(-1); if (line) progress.report({ message: line.slice(0, 120) }); });
      } finally { subscription.dispose(); activeOperations.delete(abort); }
    });
  }

  async function installTools(signal?: AbortSignal): Promise<Toolchain | undefined> {
    trusted();
    const generation = toolsGeneration;
    const provider = new WindowsMsys2Provider();
    let plan;
    try { plan = await provider.plan(); }
    catch (error) {
      const choice = await vscode.window.showErrorMessage(String(error), 'Choose Tool Storage Folder');
      if (choice && await chooseToolsFolder()) return installTools(signal);
      return;
    }
    const approved = await vscode.window.showInformationMessage('Install RTL tools?', { modal: true, detail: `Missing: ${plan.missing.join(', ') || 'None'}\nLocation: ${plan.root}\nPackages: ${plan.packages.join(', ') || 'Update and verify installed packages'}\nDownloads official MSYS2 components and verifies a small RTL build. Existing project sources are not changed.` }, 'Install');
    if (approved !== 'Install' || signal?.aborted) return;
    try {
      const tools = await withProgress('Installing RTL tools', (signal, onLog) => provider.install(plan, { signal, onLog }), signal);
      if (generation === toolsGeneration) verified = tools;
      void vscode.window.showInformationMessage('RTL toolchain is ready.');
      return tools;
    } catch (error) {
      output.appendLine(String(error));
      const choice = await vscode.window.showErrorMessage(`Tool installation failed: ${String(error)}`, 'Retry', 'Show Log');
      if (choice === 'Retry') return installTools(signal);
      if (choice === 'Show Log') output.show();
    }
  }

  async function ensureTools(signal?: AbortSignal): Promise<Toolchain | undefined> {
    if (verified) return verified;
    const generation = toolsGeneration;
    const detected = await detectTools();
    if (!detected.toolchain) return installTools(signal);
    await withProgress('Verifying RTL compiler', (signal, onLog) => verifyToolchain(detected.toolchain!, { signal, onLog }), signal);
    if (generation === toolsGeneration) verified = detected.toolchain;
    if (!detected.viewer) void vscode.window.showInformationMessage('Simulation is ready. VCD opens in the built-in viewer; GTKWave is optional for FST.');
    return detected.toolchain;
  }

  async function execute(request: vscode.TestRunRequest, token?: vscode.CancellationToken): Promise<void> {
    trusted();
    if (busy) { void vscode.window.showInformationMessage('An RTL operation is already running.'); return; }
    busy = true;
    presentation.phase='preparing'; presentation.message=undefined; presentation.targets=[]; presentation.active.clear(); presentation.statuses=[]; changes.fire();
    try {
    // Save first, then reload the manifest as well as testbench sources.
    if (!await vscode.workspace.saveAll(false)) throw Error('Save the source files before running tests.');
    await refresh(true);
    const selected = new Set<string>();
    function collect(item: vscode.TestItem) { if (entries.has(item.id)) selected.add(item.id); else item.children.forEach(collect); }
    if (request.include) request.include.forEach(collect); else entries.forEach((_, id) => selected.add(id));
    const excluded = new Set<string>();
    function exclude(item: vscode.TestItem) { excluded.add(item.id); item.children.forEach(exclude); }
    request.exclude?.forEach(exclude);
    const targets = [...selected].filter(id => !excluded.has(id)).map(id => entries.get(id)!);
    presentation.targets=targets.map(e=>`${e.project.name} / ${e.target.name}`); changes.fire();
    if (!targets.length) { presentation.phase='blocked'; presentation.message='No test targets'; void vscode.window.showInformationMessage('No test targets. Add [[test]] entries to rtl.toml or create the counter example.'); return; }
    if (targets.some(e => e.project.backend !== 'verilator')) throw Error('Only the Verilator backend is available in this release.');
    const abort = new AbortController(); activeOperations.add(abort);
    simulations.add(abort); void vscode.commands.executeCommand('setContext', 'rtl.simulating', true);
    changes.fire();
    const run = controller.createTestRun(request);
    const subscriptions = [run.token.onCancellationRequested(() => abort.abort()), token?.onCancellationRequested(() => abort.abort())];
    if (token?.isCancellationRequested) abort.abort();
    targets.forEach(e => run.enqueued(e.item));
    const completed = new Set<string>();
    let setupError: string | undefined, toolsDeclined=false;
    try {
      if (abort.signal.aborted) return;
      const tools = await ensureTools(abort.signal);
      if (!tools) { toolsDeclined=true; return; }
      const backend = new VerilatorBackend(tools);
      const groups = new Map<Project, Entry[]>();
      for (const entry of targets) groups.set(entry.project, [...(groups.get(entry.project) ?? []), entry]);
      for (const [project, group] of groups) {
        if (abort.signal.aborted) break;
        let packageProvider: SlangProvider | undefined;
        if (project.packageOrder === 'auto' && project.packageSources?.length) {
          let runtime = await detectSemanticRuntime();
          if (abort.signal.aborted) break;
          if (!runtime) { await vscode.commands.executeCommand('rtl.setupLanguage'); runtime = await detectSemanticRuntime(); }
          if (!runtime) throw Error('Automatic package ordering needs RTL language support. Set it up, or set sources.package_order="manifest".');
          packageProvider = new SlangProvider(runtime, context.asAbsolutePath('dist/analyze.py'), path.join(toolsHome(), 'cache', 'semantic'));
        }
        const byName = new Map(group.map(entry => [entry.target.name, entry]));
        await runTests(project, group.map(entry => entry.target), backend, {
          signal: abort.signal, packageProvider,
          onStart: target => { const entry=byName.get(target.name)!; run.started(entry.item); if(!abort.signal.aborted) presentation.phase='running'; presentation.active.add(entry.item.id); changes.fire(); },
          onTestLog: (target, text) => { output.append(`[${target.name}] ${text}`); run.appendOutput(text.replace(/\r?\n/g, '\r\n'), undefined, byName.get(target.name)!.item); },
          onResult: result => {
            const entry = byName.get(result.name)!;
            completed.add(entry.item.id);
            presentation.active.delete(entry.item.id); presentation.statuses.push(result.status);
            results.set(result.directory, { result, project }); refreshFreshness(); changes.fire();
            if (result.status === 'passed') run.passed(entry.item, result.durationMs);
            else if (result.status === 'cancelled') run.skipped(entry.item);
            else {
              const message = new vscode.TestMessage(result.message ?? result.status);
              if (entry.item.uri) message.location = new vscode.Location(entry.item.uri, new vscode.Position(0, 0));
              run.failed(entry.item, message, result.durationMs);
            }
          }
        });
      }
    } catch (error) { if(!abort.signal.aborted) { setupError=String(error); report(error); } }
    finally {
      targets.filter(e => !completed.has(e.item.id)).forEach(e => run.skipped(e.item));
      run.end(); subscriptions.forEach(s => s?.dispose()); activeOperations.delete(abort);
      simulations.delete(abort); void vscode.commands.executeCommand('setContext', 'rtl.simulating', simulations.size > 0);
      presentation.active.clear();
      presentation.phase=abort.signal.aborted ? 'cancelled' : setupError ? 'error' : toolsDeclined ? 'blocked' : 'completed';
      presentation.message=setupError ?? (toolsDeclined ? 'Tools not ready; no tests ran' : undefined); changes.fire();
    }
    } catch(error) { presentation.phase='error'; presentation.message=String(error); changes.fire(); throw error; }
    finally { busy = false; await refresh(); }
  }
  controller.createRunProfile('Simulate', vscode.TestRunProfileKind.Run, (request, token) => execute(request, token).catch(report), true);

  async function chooseFolder(): Promise<vscode.WorkspaceFolder | undefined> {
    const folders = vscode.workspace.workspaceFolders ?? [];
    if (!folders.length) { void vscode.window.showInformationMessage('Open a local folder first.'); return; }
    if (folders.length === 1) return folders[0];
    return vscode.window.showWorkspaceFolderPick();
  }
  async function chooseToolsFolder(): Promise<boolean> {
    const folders = await vscode.window.showOpenDialog({ canSelectFiles: false, canSelectFolders: true, canSelectMany: false, title: 'Choose a short ASCII folder for RTL tools (no spaces)' });
    if (!folders?.[0]) return false;
    const directory = folders[0].fsPath;
    if (process.platform === 'win32' && /[^A-Za-z0-9_./:\\-]/.test(directory)) throw Error('Choose an ASCII folder without spaces or special characters.');
    await vscode.workspace.getConfiguration('rtl').update('toolsDirectory', directory, vscode.ConfigurationTarget.Global);
    configureToolsHome(directory); verified = undefined; return true;
  }
  function command(id: string, handler: (...args: any[]) => unknown) {
    context.subscriptions.push(vscode.commands.registerCommand(id, (...args) => Promise.resolve().then(() => handler(...args)).catch(report)));
  }
  for (const [name, example] of [['rtl.createExample', true], ['rtl.createProject', false]] as const) {
    command(name, async () => { trusted(); const folder = await chooseFolder(); if (!folder) return; await createProject(folder.uri.fsPath, example); await refresh(); await vscode.window.showTextDocument(vscode.Uri.joinPath(folder.uri, 'rtl.toml')); });
  }
  command('rtl.refresh', refresh);
  command('rtl.runAll', () => execute(new vscode.TestRunRequest()));
  command('rtl.stopSimulation', () => { if(simulations.size) { presentation.phase='cancelling'; changes.fire(); } for (const simulation of simulations) simulation.abort(); });
  command('rtl.selectTarget', (id:string) => { if(!entries.has(id)) throw Error('This test is no longer registered. Refresh RTL tests.'); selectedId=id; changes.fire(); });
  command('rtl.runTarget', async () => { await refresh(); const entry=selectedId && entries.get(selectedId); if(!entry) { await vscode.commands.executeCommand('rtl.start.focus'); void vscode.window.showInformationMessage('Select a test in Simulation first.'); return; } await execute(new vscode.TestRunRequest([entry.item])); });
  const simulationEntry = (node: { targetId?: string }) => { const entry = node?.targetId && entries.get(node.targetId); if (!entry) throw Error('This test is no longer registered. Refresh Simulation.'); return entry; };
  command('rtl.runSimulationTest', async node => { await refresh(); const entry = simulationEntry(node); selectedId = entry.item.id; await execute(new vscode.TestRunRequest([entry.item])); });
  command('rtl.runSimulationSelection', async () => {
    const ids = simulationUi.selectedIds(); await refresh();
    if (!ids.length) return vscode.commands.executeCommand('rtl.runSelected');
    const targets = ids.map(targetId => simulationEntry({ targetId }));
    await execute(new vscode.TestRunRequest(targets.map(entry => entry.item)));
  });
  command('rtl.openSimulationSource', async node => { await refresh(); const entry = simulationEntry(node); await vscode.window.showTextDocument(vscode.Uri.file(entry.target.sources[0])); });
  command('rtl.openSimulationWaveform', async node => {
    await refresh(); const entry = simulationEntry(node), value = latestForTarget(entry);
    if (!value) { void vscode.window.showInformationMessage('Run this test first to generate a waveform.'); return; }
    return vscode.commands.executeCommand('rtl.resultActions', value, 'Open Waveform');
  });
  command('rtl.runFile', async (resource?: vscode.Uri) => {
    await refresh(); const uri = resource ?? vscode.window.activeTextEditor?.document.uri;
    const matches = targetsForFile([...entries.values()], uri);
    if (!matches.length) { void vscode.window.showInformationMessage('This file is not registered as a testbench in rtl.toml.'); return; }
    const choice = matches.length === 1 ? matches[0] : (await vscode.window.showQuickPick(matches.map(entry => ({ label: entry.target.name, description: `${entry.project.name} · ${entry.target.top}`, detail: entry.project.root, entry })), { title: 'Choose simulation for this testbench' }))?.entry;
    if (choice) { selectedId = choice.item.id; await execute(new vscode.TestRunRequest([choice.item])); }
  });
  command('rtl.latestResult', () => { const value=latestResult(); if(value) return vscode.commands.executeCommand('rtl.resultActions',value); });
  command('rtl.getSimulationStatus', simulationSnapshot);
  command('rtl.runTag', async (requestedTag?: string) => {
    await refresh();
    const tags = [...new Set([...entries.values()].flatMap(entry => entry.target.tags ?? []))].sort();
    if (!tags.length) { void vscode.window.showInformationMessage('Add tags to tests in rtl.toml first.'); return; }
    const tag = requestedTag ?? await vscode.window.showQuickPick(tags, { title: 'Run RTL tests by tag' });
    if (tag && tags.includes(tag)) await execute(new vscode.TestRunRequest([...entries.values()].filter(entry => entry.target.tags?.includes(tag)).map(entry => entry.item)));
    else if (tag) throw Error(`Unknown test tag: ${tag}`);
  });
  command('rtl.history', async () => { await refresh(); await vscode.commands.executeCommand('rtl.results.focus'); });
  command('rtl.getHistory', async () => { await refresh(); return [...results.values()].map(value => value.result); });
  command('rtl.runSelected', async () => {
    await refresh();
    const picked = await vscode.window.showQuickPick([...entries.values()].map(entry => ({ label: entry.target.name, description: `${entry.project.name} · ${entry.target.top}`, entry })), { canPickMany: true, title: 'Select RTL testbenches' });
    if (picked?.length) await execute(new vscode.TestRunRequest(picked.map(p => p.entry.item)));
  });
  command('rtl.runCurrent', async () => {
    await refresh();
    const matches = currentTestEntries();
    if (!matches.length) { void vscode.window.showInformationMessage('The current file is not registered as a testbench in rtl.toml.'); return; }
    await execute(new vscode.TestRunRequest(matches.map(e => e.item)));
  });
  command('rtl.toolchain', async () => {
    trusted();
    if (busy) throw Error('Wait for the current RTL operation to finish.');
    busy = true;
    try {
      const detected = await withProgress('Checking RTL tools', () => detectTools());
      const choice = await vscode.window.showQuickPick([
        { label: 'Verify compiler', description: detected.toolchain?.description ?? 'Missing', action: 'verify' },
        { label: 'Install missing components / update', description: detected.missing.join(', ') || 'All tools detected', action: 'install' },
        { label: 'Choose tool storage folder', description: toolsHome(), action: 'folder' },
        { label: 'Show log', description: toolsHome(), action: 'log' }
      ], { title: 'RTL Toolchain' });
      if (choice?.action === 'install') { verified = undefined; await installTools(); }
      if (choice?.action === 'verify') { verified = undefined; await ensureTools(); }
      if (choice?.action === 'log') output.show();
      if (choice?.action === 'folder') await chooseToolsFolder();
    } finally { busy = false; }
  });
  for (const [id, action] of [['rtl.resultLog', 'Open Log'], ['rtl.resultWaveform', 'Open Waveform'], ['rtl.resultRerun', 'Re-run Current Test']] as const) {
    command(id, (value: ResultEntry) => vscode.commands.executeCommand('rtl.resultActions', value, action));
  }
  command('rtl.resultActions', async (value: ResultEntry, requestedAction?: string) => {
    if (!value) return;
    const action = requestedAction ?? await vscode.window.showQuickPick(['Open Log', 'Open Source', ...(value.result.inputSnapshot?.state === 'ready' ? ['Open Recorded Source', 'Explore Recorded Structure'] : []), 'Open Waveform', 'Check Source Version', 'Re-run Current Test'], { title: `${value.result.name}: ${value.result.status}` });
    if (action === 'Check Source Version') {
      const current = await loadProject(value.project.root);
      trusted();
      const runtime = current.packageOrder === 'auto' && current.packageSources?.length ? await detectSemanticRuntime() : undefined;
      const provider = runtime ? new SlangProvider(runtime, context.asAbsolutePath('dist/analyze.py'), path.join(toolsHome(), 'cache', 'semantic')) : undefined;
      const prepared = await prepareProject(current, provider);
      const comparison = await compareResultInputs(value.result, prepared);
      const dirty = vscode.workspace.textDocuments.some(document => document.isDirty && document.uri.scheme === 'file' &&
        value.result.inputIdentity?.files?.some(file => path.resolve(file.path).toLowerCase() === path.resolve(document.uri.fsPath).toLowerCase()));
      void vscode.window.showInformationMessage(`${comparison.state}: ${comparison.message}${dirty ? ' There are unsaved input edits; save before checking structure against this result.' : ''}`);
      return { ...comparison, unsavedInputs: dirty };
    }
    if (action === 'Open Recorded Source') return vscode.commands.executeCommand('rtl.openRecordedSource', value.result);
    if (action === 'Explore Recorded Structure') return vscode.commands.executeCommand('rtl.showRecordedStructure', value.result);
    if (action === 'Open Log') await vscode.window.showTextDocument(vscode.Uri.file(value.result.log));
    if (action === 'Open Source' && value.result.source) await vscode.window.showTextDocument(vscode.Uri.file(value.result.source));
    if (action === 'Re-run Current Test') {
      await refresh();
      const entry = [...entries.values()].find(entry => entry.project.root === value.project.root && entry.target.name === value.result.name);
      if (!entry) throw Error('This test is no longer in rtl.toml. Its saved artifacts remain available.');
      await execute(new vscode.TestRunRequest([entry.item]));
    }
    if (action === 'Open Waveform') {
      if (!value.result.waveform) { void vscode.window.showInformationMessage(value.result.message ?? 'No waveform was generated. Enable waveform and add dump statements to the testbench.'); return; }
      await openWaveform(value.result.waveform);
    }
  });
  let refreshTimer: NodeJS.Timeout | undefined;
  const watcher = vscode.workspace.createFileSystemWatcher('**/*');
  const scheduleRefresh = (uri: vscode.Uri) => {
    if (uri.scheme !== 'file' || uri.fsPath.split(/[\\/]/).some(part=>['.rtl','.git','node_modules'].includes(part))) return;
    if (!/\.(toml|sv|v|svh|vh)$/i.test(uri.fsPath) && !freshnessEntries().some(entry=>affectsEntry(entry,uri.fsPath))) return;
    // Invalidate immediately; do not show a previous matching state during debounce.
    refreshFreshness();
    clearTimeout(refreshTimer); refreshTimer = setTimeout(() => { void refresh().catch(report); }, 300);
  };
  const editsChanged = (document: vscode.TextDocument) => {
    if (document.uri.scheme === 'file' && freshnessEntries().some(entry=>affectsEntry(entry,document.uri.fsPath))) changes.fire();
  };
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event=>editsChanged(event.document)), vscode.workspace.onDidCloseTextDocument(editsChanged), vscode.workspace.onDidGrantWorkspaceTrust(refreshFreshness));
  context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(document=>{ editsChanged(document); scheduleRefresh(document.uri); }));
  context.subscriptions.push(watcher, watcher.onDidCreate(scheduleRefresh), watcher.onDidChange(scheduleRefresh), watcher.onDidDelete(scheduleRefresh), vscode.workspace.onDidChangeWorkspaceFolders(() => { void refresh().catch(report); }), { dispose: () => clearTimeout(refreshTimer) });
  void refresh().then(async () => {
    if (!controller.items.size && (vscode.workspace.workspaceFolders?.length ?? 0) > 0) {
      const choice = await vscode.window.showInformationMessage('No rtl.toml found. Create an RTL project?', 'Counter Example', 'Minimal Project');
      if (choice) await vscode.commands.executeCommand(choice === 'Counter Example' ? 'rtl.createExample' : 'rtl.createProject');
    } else if (vscode.workspace.isTrusted) {
      const detected = await detectTools();
      if (detected.missing.length && !detected.toolchain) {
        const choice = await vscode.window.showInformationMessage(`RTL tools missing: ${detected.missing.join(', ')}`, 'Open Toolchain');
        if (choice) await vscode.commands.executeCommand('rtl.toolchain');
      }
    }
  }).catch(report);
}
