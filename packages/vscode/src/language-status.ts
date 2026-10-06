import * as vscode from 'vscode';
export interface LanguageStatus { label: string; detail: string; root?: string }
export function registerLanguageStatus(context: vscode.ExtensionContext, read: (uri?: string) => Promise<LanguageStatus>, log: () => void): void {
  const bar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 20);
  bar.name = 'RTL Language'; bar.command = 'rtl.languageStatus';
  let disposed = false, generation = 0;
  async function refresh() {
    const generationNow = ++generation;
    const editor = vscode.window.activeTextEditor;
    if (!editor || !['verilog', 'systemverilog'].includes(editor.document.languageId)) { bar.hide(); return; }
    const status = await read(editor.document.uri.toString());
    if (disposed || generationNow !== generation) return;
    bar.text = `RTL: ${status.label}`; bar.tooltip = `${status.detail}${status.root ? '\nProject: ' + status.root : ''}\nClick for setup, retry and logs.`; bar.show();
  }
  const timer = setInterval(() => { void refresh(); }, 1500);
  timer.unref?.();
  context.subscriptions.push(bar, vscode.window.onDidChangeActiveTextEditor(() => { void refresh(); }),
    vscode.commands.registerCommand('rtl.getLanguageStatus', (uri?: string) => read(uri)),
    vscode.commands.registerCommand('rtl.languageStatus', async () => {
      const status = await read(vscode.window.activeTextEditor?.document.uri.toString());
      const selected = await vscode.window.showQuickPick([
        { label: 'Set Up Language Support', command: 'rtl.setupLanguage' },
        { label: 'Retry Analysis', command: 'rtl.restartLanguage' },
        { label: 'Tool Storage / Simulation Tools', command: 'rtl.toolchain' },
        { label: 'Language Settings', command: 'workbench.action.openSettings' },
        { label: 'Show Language Log', command: '' }
      ], { title: `RTL Language: ${status.label}`, placeHolder: `${status.detail}${status.root ? ' · ' + status.root : ''}` });
      if (!selected) return;
      if (!selected.command) log();
      else await vscode.commands.executeCommand(selected.command, ...(selected.command === 'workbench.action.openSettings' ? ['rtl.editor.semantic'] : []));
    }), { dispose() { disposed = true; clearInterval(timer); } });
  void refresh();
}
