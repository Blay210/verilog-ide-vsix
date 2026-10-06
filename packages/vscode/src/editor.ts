import * as vscode from 'vscode';
import { basicCompletions, planBlockEnter, planTemplate, planClosingLabel } from '@rtl-dev/language';

export function registerEditor(context: vscode.ExtensionContext): void {
  const refreshKeys = () => {
    const editor = vscode.window.activeTextEditor;
    let tab = false, enter = false, beginPair = false;
    if (editor && ['verilog', 'systemverilog'].includes(editor.document.languageId) && editor.selections.length === 1 && editor.selection.isEmpty) {
      const document = editor.document, text = document.getText(), offset = document.offsetAt(editor.selection.active);
      const config = vscode.workspace.getConfiguration('rtl', document.uri);
      tab = config.get('editor.templates', true) && !!planTemplate(text, offset, document.languageId as 'verilog' | 'systemverilog');
      beginPair = /\bbegin$/.test(text.slice(0, offset)) && /^end\b/.test(text.slice(offset));
      enter = config.get('editor.autoCloseBlocks', true) && !!planBlockEnter(text, offset, { unit: '\t', eol: '\n' });
    }
    void vscode.commands.executeCommand('setContext', 'rtl.templateTab', tab);
    void vscode.commands.executeCommand('setContext', 'rtl.blockEnter', enter);
    void vscode.commands.executeCommand('setContext', 'rtl.beginPair', enter && beginPair);
  };
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(refreshKeys), vscode.window.onDidChangeTextEditorSelection(refreshKeys), vscode.workspace.onDidChangeTextDocument(refreshKeys), vscode.workspace.onDidChangeConfiguration(refreshKeys));
  refreshKeys();
  // Inline begin/end has a deliberate zero-width cursor between two keywords.
  // Restore it after native snippet acceptance, which can move it to the word end.
  const placeBeginCursor = async (uri: string, start: number) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.uri.toString() !== uri || editor.selections.length !== 1) return;
    const text = editor.document.getText();
    if (text.slice(start, start + 8) !== 'beginend') return;
    const offset = editor.document.offsetAt(editor.selection.active);
    if (offset !== start + 5 && offset !== start + 8) return;
    const version = editor.document.version, selection = editor.selection;
    await vscode.commands.executeCommand('leaveSnippet');
    if (vscode.window.activeTextEditor !== editor || editor.document.version !== version || !editor.selection.isEqual(selection)) return;
    const point = editor.document.positionAt(start + 5);
    editor.selection = new vscode.Selection(point, point);
    refreshKeys();
  };
  context.subscriptions.push(vscode.commands.registerCommand('rtl.placeBeginCursor', placeBeginCursor));
  context.subscriptions.push(vscode.commands.registerCommand('rtl.expandTemplate', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !['verilog', 'systemverilog'].includes(editor.document.languageId) || editor.selections.length !== 1 || !editor.selection.isEmpty || !vscode.workspace.getConfiguration('rtl', editor.document.uri).get('editor.templates', true)) return vscode.commands.executeCommand('tab');
    const version = editor.document.version, selection = editor.selection;
    const document = editor.document, edit = planTemplate(document.getText(), document.offsetAt(editor.selection.active), document.languageId as 'verilog' | 'systemverilog');
    if (!edit) return vscode.commands.executeCommand('tab');
    await vscode.commands.executeCommand('hideSuggestWidget');
    if (document.version !== version || !editor.selection.isEqual(selection)) return;
    await editor.insertSnippet(new vscode.SnippetString(edit.snippet), new vscode.Range(document.positionAt(edit.start), document.positionAt(edit.end)));
    if (edit.label === 'begin') await placeBeginCursor(document.uri.toString(), edit.start);
    refreshKeys();
  }));
  const selector: vscode.DocumentSelector = [{ language: 'verilog' }, { language: 'systemverilog' }];
  // Closing labels are SystemVerilog syntax and need no compiler/tool installation.
  context.subscriptions.push(vscode.languages.registerCodeActionsProvider({language:'systemverilog'}, {
    provideCodeActions(document, range, actionContext) {
      if (!range.isEmpty || actionContext.only && !actionContext.only.contains(vscode.CodeActionKind.RefactorRewrite)) return [];
      const edit = planClosingLabel(document.getText(), document.offsetAt(range.start));
      if (!edit) return [];
      const action = new vscode.CodeAction(`Add closing label '${edit.name}'`, vscode.CodeActionKind.RefactorRewrite);
      action.edit = new vscode.WorkspaceEdit();
      action.edit.insert(document.uri, document.positionAt(edit.offset), edit.text);
      return [action];
    }
  }, {providedCodeActionKinds:[vscode.CodeActionKind.RefactorRewrite]}));
  context.subscriptions.push(vscode.languages.registerCompletionItemProvider(selector, {
    provideCompletionItems(document, position) {
      if (!vscode.workspace.getConfiguration('rtl', document.uri).get('editor.basicCompletions', true)) return [];
      const offset = document.offsetAt(position);
      const result = basicCompletions(document.getText(), offset, document.languageId as 'verilog' | 'systemverilog');
      return result.items.map(entry => {
        const kind = entry.kind === 'keyword' ? vscode.CompletionItemKind.Keyword : entry.kind === 'primitive' ? vscode.CompletionItemKind.Module : vscode.CompletionItemKind.Function;
        const item = new vscode.CompletionItem(entry.label, kind);
        item.detail = entry.detail;
        item.range = new vscode.Range(document.positionAt(result.start), position);
        item.insertText = entry.label;
        const template = vscode.workspace.getConfiguration('rtl', document.uri).get('editor.templates', true) ? planTemplate(document.getText(), offset, document.languageId as 'verilog' | 'systemverilog', entry.label) : undefined;
        if (template?.label === 'begin') item.command = { command: 'rtl.placeBeginCursor', title: 'Place block cursor', arguments: [document.uri.toString(), template.start] };
        if (template) {
          item.insertText = new vscode.SnippetString(template.snippet); item.kind = vscode.CompletionItemKind.Snippet;
          item.detail = entry.label === 'fork' && document.languageId === 'systemverilog'
            ? 'fork template · Choose join (all), join_any (one), join_none (no wait), then Tab to body'
            : `${entry.label} template · Tab moves between fields`;
        }
        return item;
      });
    }
  }, '$'));

  context.subscriptions.push(vscode.commands.registerCommand('rtl.insertNewline', async () => {
    const editor = vscode.window.activeTextEditor;
    const fallback = () => vscode.commands.executeCommand('default:type', { text: '\n' });
    if (!editor || !['verilog', 'systemverilog'].includes(editor.document.languageId) || editor.selections.length !== 1 || !editor.selection.isEmpty || !vscode.workspace.getConfiguration('rtl', editor.document.uri).get('editor.autoCloseBlocks', true)) return fallback();
    const document = editor.document;
    const version = document.version;
    const selection = editor.selection;
    const start = document.offsetAt(selection.active);
    const tabSize = typeof editor.options.tabSize === 'number' ? editor.options.tabSize : 4;
    const edit = planBlockEnter(document.getText(), document.offsetAt(editor.selection.active), {
      unit: editor.options.insertSpaces === false ? '\t' : ' '.repeat(tabSize),
      eol: document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n'
    });
    if (!edit || document.version !== version) return fallback();
    await vscode.commands.executeCommand('hideSuggestWidget');
    if (document.version !== version || !editor.selection.isEqual(selection)) return;
    await vscode.commands.executeCommand('leaveSnippet');
    if (document.version !== version || !editor.selection.isEqual(selection)) return;
    // A snippet would add VS Code's own indentation on top of our calculated
    // indentation. Apply one plain-text edit so tabs, CRLF and undo stay exact.
    const applied = await editor.edit(builder => builder.replace(
      new vscode.Range(document.positionAt(start), document.positionAt(edit.replaceEnd)),
      edit.beforeCursor + edit.afterCursor
    ), { undoStopBefore: true, undoStopAfter: true });
    if (applied) {
      const cursor = document.positionAt(start + edit.beforeCursor.length);
      editor.selection = new vscode.Selection(cursor, cursor);
    }
  }));
}
