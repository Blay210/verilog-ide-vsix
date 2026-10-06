import * as vscode from 'vscode';
import assert from 'node:assert/strict';

export async function testEditor(): Promise<void> {
  async function open(text: string, language = 'systemverilog') {
    const offset = text.indexOf('|');
    const document = await vscode.workspace.openTextDocument({ language, content: text.replace('|', '') });
    const editor = await vscode.window.showTextDocument(document);
    editor.options = { tabSize: 4, insertSpaces: true };
    const point = document.positionAt(offset);
    editor.selection = new vscode.Selection(point, point);
    return { editor, document };
  }
  async function close() { await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor'); }
  const labelled = await open('module chip;\r\n\tinitial begin : pipeline|\r\n\tend // keep\r\nendmodule');
  const beforeLabel = labelled.document.getText();
  const actions = await vscode.commands.executeCommand<vscode.CodeAction[]>('vscode.executeCodeActionProvider', labelled.document.uri, labelled.editor.selection, 'refactor.rewrite');
  const labelAction = actions.find(a=>a.title === "Add closing label 'pipeline'");
  assert.ok(labelAction?.edit && await vscode.workspace.applyEdit(labelAction.edit));
  assert.ok(labelled.document.getText().includes('end : pipeline // keep'));
  await vscode.commands.executeCommand('undo');
  assert.equal(labelled.document.getText(), beforeLabel);
  assert.ok(await vscode.workspace.applyEdit(labelAction!.edit!));
  const repeated = await vscode.commands.executeCommand<vscode.CodeAction[]>('vscode.executeCodeActionProvider', labelled.document.uri, labelled.editor.selection, 'refactor.rewrite');
  assert.ok(!repeated.some(a=>a.title === "Add closing label 'pipeline'"));
  await close();
  const legacyLabel = await open('module chip|; endmodule', 'verilog');
  const legacyActions = await vscode.commands.executeCommand<vscode.CodeAction[]>('vscode.executeCodeActionProvider', legacyLabel.document.uri, legacyLabel.editor.selection, 'refactor.rewrite');
  assert.ok(!legacyActions.some(a=>a.title.startsWith('Add closing label')));
  await close();
  console.log('RTL_CLOSING_LABEL_PASS: explicit action / comments / one-step undo / repeat protection / SV only');
  const classTemplate = await open('class|');
  await vscode.commands.executeCommand('rtl.expandTemplate');
  assert.equal(classTemplate.editor.selection.active.character, 6);
  await vscode.commands.executeCommand('default:type', {text:'Transaction'});
  await vscode.commands.executeCommand('jumpToNextSnippetPlaceholder');
  assert.equal(classTemplate.editor.selection.active.line, 1);
  assert.equal(classTemplate.editor.selection.active.character, 4);
  await vscode.commands.executeCommand('default:type', {text:'int data;'});
  assert.equal(classTemplate.document.getText().replaceAll('\r\n','\n'), 'class Transaction;\n    int data;\nendclass');
  await close();
  for (const join of ['join','join_any','join_none']) {
    const forkTemplate = await open('\tfork|');
    forkTemplate.editor.options = {insertSpaces:false,tabSize:4};
    await forkTemplate.editor.edit(edit=>edit.setEndOfLine(vscode.EndOfLine.CRLF));
    await vscode.commands.executeCommand('rtl.expandTemplate');
    assert.equal(forkTemplate.document.getText(), '\tfork\r\n\t\t\r\n\tjoin');
    assert.equal(forkTemplate.document.getText(forkTemplate.editor.selection), 'join');
    const choices = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', forkTemplate.document.uri, forkTemplate.editor.selection.active);
    for (const label of ['join','join_any','join_none']) assert.ok(choices.items.some(i=>i.label === label), label);
    await vscode.commands.executeCommand('hideSuggestWidget');
    await vscode.commands.executeCommand('default:type', {text:join});
    await vscode.commands.executeCommand('jumpToNextSnippetPlaceholder');
    assert.equal(forkTemplate.editor.selection.active.line, 1);
    assert.equal(forkTemplate.editor.selection.active.character, 2);
    await vscode.commands.executeCommand('default:type', {text:'worker();'});
    assert.equal(forkTemplate.document.getText(), `\tfork\r\n\t\tworker();\r\n\t${join}`);
    await close();
  }
  const undoFork = await open('fork|');
  await vscode.commands.executeCommand('rtl.expandTemplate');
  await vscode.commands.executeCommand('leaveSnippet');
  await vscode.commands.executeCommand('undo');
  assert.equal(undoFork.document.getText(), 'fork');
  await close();
  const legacyFork = await open('fork|', 'verilog');
  await vscode.commands.executeCommand('rtl.expandTemplate');
  assert.equal(legacyFork.document.getText().replaceAll('\r\n','\n'), 'fork\n    \njoin');
  assert.equal(legacyFork.editor.selection.active.line, 1);
  await close();
  for (const suffix of ['join','join_any','join_none']) {
    const existing = await open(`fork|\n${suffix}`);
    await vscode.commands.executeCommand('rtl.expandTemplate');
    assert.equal(existing.document.getText().match(new RegExp(`\\b${suffix}\\b`, 'g'))?.length, 1);
    await close();
  }
  console.log('RTL_CLASS_FORK_PASS: class fields / three join choices / tab-CRLF / undo / legacy join / existing closers');
  const moduleTemplate = await open('module|');
  await vscode.commands.executeCommand('rtl.expandTemplate');
  assert.equal(moduleTemplate.document.getText().replaceAll('\r\n', '\n'), 'module  (\n    \n);\n    \nendmodule');
  assert.equal(moduleTemplate.editor.selection.active.character, 7);
  await vscode.commands.executeCommand('default:type', { text: 'counter' });
  await vscode.commands.executeCommand('jumpToNextSnippetPlaceholder');
  assert.equal(moduleTemplate.editor.selection.active.line, 1);
  await vscode.commands.executeCommand('default:type', { text: 'input logic clk' });
  await vscode.commands.executeCommand('jumpToNextSnippetPlaceholder');
  assert.equal(moduleTemplate.editor.selection.active.line, 3);
  assert.equal(moduleTemplate.editor.selection.active.character, 4);
  assert.match(moduleTemplate.document.getText(), /module counter \(/);
  await close();
  for (const keyword of ['package', 'case', 'casex', 'casez', 'generate', 'interface', 'program', 'function', 'task']) {
    const snippet = await open(`${keyword}|`);
    await vscode.commands.executeCommand('rtl.expandTemplate');
    assert.ok(snippet.document.getText().includes(keyword.startsWith('case') ? 'endcase' : `end${keyword}`), keyword);
    await vscode.commands.executeCommand('leaveSnippet');
    await close();
  }
  const inlineBegin = await open('begin|');
  await vscode.commands.executeCommand('rtl.expandTemplate');
  assert.equal(inlineBegin.document.getText(), 'beginend');
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(inlineBegin.editor.selection.active.character, 5);
  await vscode.commands.executeCommand('rtl.insertNewline');
  assert.equal(inlineBegin.document.getText().replaceAll('\r\n', '\n'), 'begin\n    \nend');
  assert.equal(inlineBegin.editor.selection.active.line, 1);
  assert.equal(inlineBegin.editor.selection.active.character, 4);
  await close();
  const acceptedBegin = await open('beg|');
  await vscode.commands.executeCommand('editor.action.triggerSuggest');
  await new Promise(resolve => setTimeout(resolve, 500));
  await vscode.commands.executeCommand('acceptSelectedSuggestion');
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(acceptedBegin.document.getText(), 'beginend');
  assert.equal(acceptedBegin.editor.selection.active.character, 5);
  await vscode.commands.executeCommand('rtl.insertNewline');
  assert.equal(acceptedBegin.document.getText().replaceAll('\r\n', '\n'), 'begin\n    \nend');
  await close();
  const suggestBegin = await open('begin|');
  await vscode.commands.executeCommand('editor.action.triggerSuggest');
  await vscode.commands.executeCommand('rtl.insertNewline');
  assert.equal(suggestBegin.document.getText().replaceAll('\r\n', '\n'), 'begin\n    \nend');
  await close();
  for (const [before, expected] of [
    ['initial begin|', 'initial begin\n    \nend'],
    ['    if (x) begin|', '    if (x) begin\n        \n    end'],
    ['case (op)|', 'case (op)\n    \nendcase'],
    ['begin|\nend', 'begin\n    \nend'],
    ['begin| end', 'begin\n    \nend']
  ]) {
    const { editor, document } = await open(before);
    await vscode.commands.executeCommand('rtl.insertNewline');
    assert.equal(document.getText().replaceAll('\r\n', '\n'), expected, before);
    assert.equal(editor.selection.active.line, 1);
    assert.equal(editor.selection.active.character, before.startsWith('    ') ? 8 : 4);
    await vscode.commands.executeCommand('undo');
    assert.equal(document.getText(), before.replace('|', ''), 'one undo must restore the opener');
    await close();
  }
  for (const before of ['// begin|', 'always @(posedge clk)|', 'if (ready)|', '"begin|']) {
    const { document } = await open(before);
    await vscode.commands.executeCommand('rtl.insertNewline');
    assert.ok(!/\bend(?:case)?\b/.test(document.getText()), before);
    await close();
  }
  for (const [text, expected] of [['log|', 'logic'], ['$mon|', '$monitor'], ['xo|', 'xor']]) {
    const { editor, document } = await open(text);
    const completions = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', document.uri, editor.selection.active);
    const item = completions.items.find(i => (typeof i.label === 'string' ? i.label : i.label.label) === expected);
    assert.ok(item, `Missing ${expected}`);
    if (expected.startsWith('$')) {
      assert.ok(item.range instanceof vscode.Range);
      assert.equal(item.range.start.character, 0, 'replacement must include the existing dollar sign');
    }
    await close();
  }
  // Built-in comments and punctuation pairs must work without another extension.
  const { document } = await open('logic data;|');
  await vscode.commands.executeCommand('editor.action.commentLine');
  assert.match(document.getText(), /^\/\//);
  await close();
  const tabbed = await open('\tbegin|');
  tabbed.editor.options = { insertSpaces: false, tabSize: 4 };
  await tabbed.editor.edit(edit => edit.setEndOfLine(vscode.EndOfLine.CRLF));
  await vscode.commands.executeCommand('rtl.insertNewline');
  assert.equal(tabbed.document.getText(), '\tbegin\r\n\t\t\r\n\tend');
  assert.equal(tabbed.editor.selection.active.character, 2);
  await close();
  const paired = await open('|');
  await vscode.commands.executeCommand('default:type', { text: '(' });
  assert.equal(paired.document.getText(), '()');
  await close();
  const literal = await open('8|');
  await vscode.commands.executeCommand('default:type', { text: "'" });
  assert.equal(literal.document.getText(), "8'");
  await close();
  const settings = vscode.workspace.getConfiguration('rtl');
  try {
    await settings.update('editor.templates', false, vscode.ConfigurationTarget.Global);
    const disabledTemplate = await open('module|');
    await vscode.commands.executeCommand('rtl.expandTemplate');
    assert.ok(!disabledTemplate.document.getText().includes('endmodule'));
    await close();
    await settings.update('editor.autoCloseBlocks', false, vscode.ConfigurationTarget.Global);
    const disabled = await open('begin|');
    await vscode.commands.executeCommand('rtl.insertNewline');
    assert.ok(!disabled.document.getText().includes('end'));
    await close();
    await settings.update('editor.basicCompletions', false, vscode.ConfigurationTarget.Global);
    const noCompletion = await open('$mon|');
    const values = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', noCompletion.document.uri, noCompletion.editor.selection.active);
    assert.ok(!values.items.some(item => item.label === '$monitor'));
    await close();
  } finally {
    await settings.update('editor.templates', undefined, vscode.ConfigurationTarget.Global);
    await settings.update('editor.autoCloseBlocks', undefined, vscode.ConfigurationTarget.Global);
    await settings.update('editor.basicCompletions', undefined, vscode.ConfigurationTarget.Global);
  }
  console.log('RTL_EDITOR_TEST_PASS: block insertion / indentation / cursor / undo / completions / comments');
}
