import * as vscode from 'vscode';
import path from 'node:path';
import { registerLanguageStatus, type LanguageStatus } from './language-status';
import { configureToolsHome, detectSemanticRuntime, installSemanticRuntime, semanticRoot, toolsHome } from '@rtl-dev/toolchain';
import type { LanguageClient } from 'vscode-languageclient/node';

export function registerSemantic(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel('RTL Language');
  let client: LanguageClient | undefined;
  let disposed = false, prompted = false, installing = false;
  let runtime: LanguageStatus = { label: 'Starting', detail: 'Checking language tools.' };
  registerLanguageStatus(context, async uri => {
    const location = `Tools: ${toolsHome()}`;
    if (!vscode.workspace.isTrusted) return { label: 'Trust required', detail: 'Trust this workspace to enable semantic analysis. ' + location };
    if (!vscode.workspace.getConfiguration('rtl').get('editor.semantic', true)) return { label: 'Disabled', detail: 'Enable RTL Editor: Semantic in settings. ' + location };
    if (installing) return { label: 'Installing', detail: location };
    if (!client?.isRunning()) return { ...runtime, detail: runtime.detail + '\n' + location };
    if (!uri) return { label: 'Select an RTL file', detail: location };
    try { const result = await client.sendRequest<LanguageStatus>('rtl/languageStatus', { uri }); return { ...result, detail: result.detail + '\n' + location }; }
    catch (error) { return { label: 'Connection failed', detail: String(error) + '\n' + location }; }
  }, () => output.show());
  let queue = Promise.resolve();
  let installation: AbortController | undefined;
  const enabled = () => vscode.workspace.isTrusted && vscode.workspace.getConfiguration('rtl').get('editor.semantic', true);
  const report = (error: unknown) => { runtime = { label: 'Language failed', detail: String(error) }; output.appendLine(String(error)); void vscode.window.showErrorMessage(`RTL language support: ${String(error)}`, 'Show Log').then(choice => { if (choice) output.show(); }); };
  async function restart(): Promise<void> {
    runtime = { label: 'Starting', detail: 'Checking language tools.' };
    if (client) { await client.stop(); client = undefined; }
    if (disposed || !enabled()) return;
    configureToolsHome(vscode.workspace.getConfiguration('rtl').get<string>('toolsDirectory'));
    const python = await detectSemanticRuntime();
    if (disposed) return;
    if (!python) {
      runtime = { label: 'Tools missing', detail: 'Use Set Up Language Support or select the existing tool storage folder.' };
      if (!prompted) {
        prompted = true;
        void vscode.window.showInformationMessage('Set up RTL module/port intelligence and diagnostics?', 'Set Up').then(choice => { if (choice) void vscode.commands.executeCommand('rtl.setupLanguage'); });
      }
      return;
    }
    const { LanguageClient, TransportKind } = await import('vscode-languageclient/node');
    if (disposed) return;
    client = new LanguageClient('rtl-slang', 'RTL Language', {
      module: context.asAbsolutePath('dist/server.cjs'), transport: TransportKind.ipc
    }, {
      documentSelector: [{ scheme: 'file', language: 'verilog' }, { scheme: 'file', language: 'systemverilog' }],
      outputChannel: output,
      initializationOptions: { python, bridge: context.asAbsolutePath('dist/analyze.py'), cache: path.join(toolsHome(), 'cache', 'semantic') },
      synchronize: { fileEvents: watcher }
    });
    await client.start();
    runtime = { label: 'Language stopped', detail: 'Retry analysis or open the language log.' };
    if (disposed) { await client.stop(); client = undefined; }
  }
  const enqueue = () => { queue = queue.then(restart).catch(report); return queue; };
  const watcher = vscode.workspace.createFileSystemWatcher('**/{rtl.toml,*.sv,*.v,*.svh,*.vh}');
  context.subscriptions.push(output, watcher,
    vscode.commands.registerCommand('rtl.restartLanguage', enqueue),
    vscode.commands.registerCommand('rtl.setupLanguage', async () => {
      if (!vscode.workspace.isTrusted) { report('Trust this workspace before installing language tools.'); return; }
      if (installing || disposed) return;
      const approved = await vscode.window.showInformationMessage('Install RTL language tools?', { modal: true, detail: `slang 11.0.0 + private Python 3.14.7\nLocation: ${semanticRoot()}\nOfficial python.org/PyPI downloads verified against published SHA256 values. System PATH is unchanged.` }, 'Install');
      if (approved !== 'Install' || installing || disposed) return;
      installing = true;
      try {
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Setting up RTL language support', cancellable: true }, async (progress, token) => {
          installation = new AbortController();
          const subscription = token.onCancellationRequested(() => installation?.abort());
          try { await installSemanticRuntime({ signal: installation.signal, onLog: text => { output.append(text); progress.report({ message: text.trim() }); } }); }
          finally { subscription.dispose(); installation = undefined; }
        });
        await enqueue();
      } catch (error) {
        output.appendLine(String(error));
        const choice = await vscode.window.showErrorMessage(`RTL language setup failed: ${String(error)}`, 'Retry', 'Show Log');
        if (choice === 'Retry') { installing = false; await vscode.commands.executeCommand('rtl.setupLanguage'); }
        if (choice === 'Show Log') output.show();
      } finally { installing = false; }
    }),
    vscode.workspace.onDidGrantWorkspaceTrust(() => { void enqueue(); }),
    vscode.workspace.onDidChangeConfiguration(event => { if (event.affectsConfiguration('rtl.editor.semantic') || event.affectsConfiguration('rtl.toolsDirectory')) void enqueue(); }),
    { dispose: () => { disposed = true; installation?.abort(); void enqueue(); } }
  );
  void enqueue();
}
