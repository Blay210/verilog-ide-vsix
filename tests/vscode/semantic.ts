import * as vscode from 'vscode';
import assert from 'node:assert/strict';
import { readFile, writeFile, rename } from 'node:fs/promises';

async function eventually<T>(operation: () => PromiseLike<T>, accept: (value: T) => boolean, message: string): Promise<T> {
  const deadline = Date.now() + 25000;
  let last: T;
  do {
    last = await operation();
    if (accept(last)) return last;
    await new Promise(resolve => setTimeout(resolve, 200));
  } while (Date.now() < deadline);
  throw Error(`${message}: ${JSON.stringify(last!)}`);
}
export async function testSemantic(): Promise<void> {
  const root = vscode.workspace.workspaceFolders![0].uri;
  await vscode.commands.executeCommand('rtl.restartLanguage');
  const dut = await vscode.workspace.openTextDocument(vscode.Uri.joinPath(root, 'rtl/counter.sv'));
  const tb = await vscode.workspace.openTextDocument(vscode.Uri.joinPath(root, 'tb/counter_basic_tb.sv'));
  const originalDut = dut.getText(), originalTb = tb.getText();
  async function replace(document: vscode.TextDocument, text: string) {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), text);
    assert.ok(await vscode.workspace.applyEdit(edit));
  }
  try {
    await replace(dut, originalDut.replace(/\bcount\b/g, 'tally'));
    const changed = originalTb.replace(/dut\s*\(\.\*\)/, 'dut(.clk(clk), .rst_n(rst_n), .ta)');
    assert.notEqual(changed, originalTb);
    await replace(tb, changed);
    const position = tb.positionAt(changed.indexOf('.ta)') + 3);
    const completion = await eventually(() => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', tb.uri, position), value => !!value?.items.some(item => item.label === 'tally'), 'Unsaved port completion missing');
    assert.ok(!completion.items.some(item => item.label === 'count' || item.label === 'clk' || item.label === 'rst_n'));
    const bareDot = changed.replace('.ta)', '.)');
    await replace(tb, bareDot);
    const dotPosition = tb.positionAt(bareDot.indexOf('.)') + 1);
    const bareCompletion = await eventually(() => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', tb.uri, dotPosition, '.'), value => !!value?.items.some(item => item.label === 'tally'), 'Bare-dot port completion missing');
    assert.ok(!bareCompletion.items.some(item => item.label === 'clk' || item.label === 'rst_n'));
    assert.match(bareCompletion.items.find(item => item.label === 'tally')!.detail ?? '', /output.*logic\[7:0\]/);
    const unfinished = 'module counter_basic_tb; timeunit 1ns; timeprecision 1ps; logic clk; counter dut(.clk(clk), .';
    await replace(tb, unfinished);
    const eofCompletion = await eventually(() => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', tb.uri, tb.positionAt(unfinished.length), '.'), value => !!value?.items.some(item => item.label === 'tally'), 'EOF port completion missing in real language server');
    assert.ok(!eofCompletion.items.some(item => item.label === 'clk'));
    const unfinishedCall = unfinished.slice(0, -1) + '.tally(';
    await replace(tb, unfinishedCall);
    await eventually(() => vscode.commands.executeCommand<vscode.SignatureHelp>('vscode.executeSignatureHelpProvider', tb.uri, tb.positionAt(unfinishedCall.length), '('), value => !!value?.signatures.some(signature => signature.label.includes('logic[7:0] tally')), 'EOF port signature missing in real language server');
    await replace(tb, bareDot);
    const implicit = bareDot.replace('.clk(clk)', '.clk').replace('.rst_n(rst_n)', '.rst_n').replace('.)', '. )');
    await replace(tb, implicit);
    const spacedPosition = tb.positionAt(implicit.indexOf('. )') + 2);
    const spaced = await eventually(() => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', tb.uri, spacedPosition), value => !!value?.items.some(item => item.label === 'tally'), 'Spaced-dot completion missing');
    assert.ok(!spaced.items.some(item => item.label === 'clk' || item.label === 'rst_n'), 'implicit ports must be excluded');
    console.log('RTL_PORT_FIX_PASS: implicit connected ports / whitespace after dot');
    await replace(tb, bareDot);
    const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>('vscode.executeSignatureHelpProvider', tb.uri, dotPosition, '(');
    console.log('RTL_AUDIT_SIGNATURE', JSON.stringify(signature ?? null));
    await replace(tb, changed);
    console.log('RTL_AUDIT_PORT_PASS: bare dot / connected exclusions / direction and width');
    const status = await eventually(() => vscode.commands.executeCommand<{label: string; detail: string; root?: string}>('rtl.getLanguageStatus', tb.uri.toString()), value => !!value?.root && ['Ready', 'Source errors'].includes(value.label), 'Language readiness missing');
    assert.ok(status.detail.includes('Tools:'), 'effective tool storage must be visible');
    const unsavedStatus = await vscode.commands.executeCommand<{label: string}>('rtl.getLanguageStatus', 'untitled:rtl-status.sv');
    assert.equal(unsavedStatus.label, 'Save file first');
    const outsideStatus = await vscode.commands.executeCommand<{label: string}>('rtl.getLanguageStatus', vscode.Uri.joinPath(root, 'unlisted.sv').toString());
    assert.equal(outsideStatus.label, 'Not a listed source');
    const hover = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', dut.uri, dut.positionAt(dut.getText().indexOf('tally') + 2));
    assert.match(hover.flatMap(h => h.contents.map(c => typeof c === 'string' ? c : c.value)).join('\n'), /logic\[7:0\]/);
    await replace(tb, changed.replace('.ta)', '.tally())'));
    const connectionPosition = tb.positionAt(tb.getText().indexOf('.tally(') + '.tally('.length);
    const connections = await eventually(() => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', tb.uri, connectionPosition, '('), value => !!value?.items.some(item=>item.label === 'count' && item.detail?.includes('Same width')), 'Port connection ranking missing');
    const countCandidate = connections.items.find(item=>item.label==='count')!;
    const clockCandidate = connections.items.find(item=>item.label==='clk')!;
    assert.ok(countCandidate.sortText! < clockCandidate.sortText!);
    assert.match(clockCandidate.detail!, /Width differs/);
    console.log('RTL_CONNECTION_RANK_PASS: scope signals / width ranking / alternatives retained');
    const signaturePosition = tb.positionAt(tb.getText().indexOf('.tally(') + '.tally('.length);
    const help = await eventually(() => vscode.commands.executeCommand<vscode.SignatureHelp>('vscode.executeSignatureHelpProvider', tb.uri, signaturePosition, '('), value => !!value?.signatures.length, 'Module port signature missing');
    assert.equal(help.activeParameter, 2);
    assert.match(help.signatures[0].label, /output logic\[7:0\] tally/);
    console.log('RTL_PORT_SIGNATURE_PASS: unsaved named port / actual width / active parameter');
    const beforeParametersDut = dut.getText(), beforeParametersTb = tb.getText();
    await replace(dut, beforeParametersDut.replace('module counter (', 'module counter #(parameter int WIDTH=8) ('));
    await replace(tb, beforeParametersTb.replace('counter dut', 'counter #(.WIDTH(8)) dut'));
    const parameterPosition = tb.getText().indexOf('#(');
    assert.ok(parameterPosition >= 0, 'example must contain a parameter override');
    const parameterHelp = await eventually(() => vscode.commands.executeCommand<vscode.SignatureHelp>('vscode.executeSignatureHelpProvider', tb.uri, tb.positionAt(parameterPosition + 2), '('), value => !!value?.signatures.length, 'Parameter signature missing');
    assert.equal(parameterHelp.activeParameter, 0);
    assert.match(parameterHelp.signatures[0].label, /WIDTH/);
    console.log('RTL_PARAMETER_SIGNATURE_PASS: declaration parameters / active parameter');
    await replace(dut, beforeParametersDut); await replace(tb, beforeParametersTb);
    const definitions = await eventually(() => vscode.commands.executeCommand<(vscode.Location | vscode.LocationLink)[]>('vscode.executeDefinitionProvider', tb.uri, tb.positionAt(tb.getText().indexOf('.tally') + 3)), value => !!value?.length, 'Port definition missing');
    const definition = definitions[0];
    const uri = 'uri' in definition ? definition.uri : definition.targetUri;
    assert.equal(uri.fsPath.toLowerCase(), dut.uri.fsPath.toLowerCase());
    assert.equal(await readFile(dut.uri.fsPath, 'utf8'), originalDut, 'Semantic edits must not save RTL');
    const broken = dut.getText().replace('endmodule', '/* 한글 😀 */ assign tally = missing_symbol;\nendmodule');
    await replace(dut, broken);
    const diagnostics = await eventually(async () => vscode.languages.getDiagnostics(dut.uri), value => value.some(d => d.source === 'slang' && d.message.includes('missing_symbol')), 'Unsaved diagnostic missing');
    const diagnostic = diagnostics.find(d => d.message.includes('missing_symbol'))!;
    assert.equal(dut.offsetAt(diagnostic.range.start), broken.indexOf('missing_symbol'));
    await replace(dut, originalDut); await replace(tb, originalTb);
    await eventually(async () => vscode.languages.getDiagnostics(dut.uri), value => !value.some(d => d.message.includes('missing_symbol')), 'Stale diagnostics not cleared');

    const calls = originalTb.replace('endmodule', `function int calc(input int foo, input string boo="hi"); return foo; endfunction
      task emit_value(output int value); value=1; endtask
      int result;
      initial begin result=calc(1, "test"); emit_value(result); end
    endmodule`);
    await replace(tb, calls);
    for (const [needle, expected, active] of [['calc(1, ', 'input string boo', 1], ['emit_value(result', 'output int value', 0]] as const) {
      const at = tb.positionAt(calls.indexOf(needle) + needle.length);
      const help = await eventually(() => vscode.commands.executeCommand<vscode.SignatureHelp>('vscode.executeSignatureHelpProvider', tb.uri, at, ','), value => !!value?.signatures.some(s=>s.label.includes(expected)), 'Callable signature missing');
      assert.equal(help.activeParameter, active);
    }
    await replace(tb, originalTb);
    console.log('RTL_CALLABLE_SIGNATURE_PASS: unsaved function defaults / task direction / active argument');

    const packageText = 'package editor_pkg; parameter int EXPORTED=8; typedef logic [7:0] word_t; typedef enum {IDLE, BUSY} state_t; function int helper(input int x); return x; endfunction endpackage\n';
    await replace(dut, packageText + originalDut);
    const enumTb = originalTb.replace('endmodule', `editor_pkg::state_t state;
initial begin
  case(state)
    // keep this comment
  endcase
end
endmodule`);
    await replace(tb, enumTb);
    await vscode.window.showTextDocument(tb);
    const enumPosition = tb.positionAt(enumTb.indexOf('case(state)'));
    const actions = await eventually(() => vscode.commands.executeCommand<vscode.CodeAction[]>('vscode.executeCodeActionProvider', tb.uri, new vscode.Range(enumPosition, enumPosition), 'refactor.rewrite'), value=>!!value?.some(a=>a.title === 'Generate enum case branches'), 'Enum case action missing');
    const action = actions.find(a=>a.title === 'Generate enum case branches')!;
    assert.ok(action.edit && await vscode.workspace.applyEdit(action.edit));
    for (const label of ['editor_pkg::IDLE:', 'editor_pkg::BUSY:', 'default:', '// keep this comment']) assert.ok(tb.getText().includes(label), label);
    assert.equal(tb.getText().match(/endcase/g)?.length, 1);
    await vscode.commands.executeCommand('undo');
    assert.equal(tb.getText(), enumTb, 'enum generation must undo in one step');
    const existingEnum = enumTb.replace('// keep this comment', 'editor_pkg::IDLE: begin end');
    await replace(tb, existingEnum);
    const existingActions = await vscode.commands.executeCommand<vscode.CodeAction[]>('vscode.executeCodeActionProvider', tb.uri, new vscode.Range(enumPosition, enumPosition), 'refactor.rewrite');
    assert.ok(!existingActions?.some(a=>a.title === 'Generate enum case branches'));
    console.log('RTL_ENUM_CASE_PASS: package labels / preserved comment / one-step undo / existing branch protection');
    const scopedTb = originalTb.replace('endmodule', `function automatic int inspect(input int scope_arg);
      import editor_pkg::*;
      int scope_local;
      begin int scope_inner; $display(scope_); end
      $display(scope_);
      return scope_arg;
    endfunction
    initial $display(editor_pkg::);
endmodule`);
    await replace(tb, scopedTb);
    const packagePosition = tb.positionAt(scopedTb.indexOf('editor_pkg::') + 'editor_pkg::'.length);
    const packages = await eventually(() => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', tb.uri, packagePosition, ':'), value => !!value?.items.some(i => i.label === 'EXPORTED'), 'Package completion missing');
    for (const name of ['word_t', 'IDLE', 'BUSY', 'helper']) assert.ok(packages.items.some(i => i.label === name), name);
    assert.ok(!packages.items.some(i => i.label === 'scope_local'));
    const innerPosition = tb.positionAt(scopedTb.indexOf('$display(scope_)') + '$display(scope_'.length);
    const locals = await eventually(() => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', tb.uri, innerPosition), value => !!value?.items.some(i => i.label === 'scope_inner'), 'Nested local completion missing');
    assert.ok(locals.items.some(i => i.label === 'scope_arg')); assert.ok(locals.items.some(i => i.label === 'scope_local'));
    const outerPosition = tb.positionAt(scopedTb.lastIndexOf('$display(scope_)') + '$display(scope_'.length);
    const outerLocals = await eventually(() => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', tb.uri, outerPosition), value => !!value?.items.some(i => i.label === 'scope_local'), 'Outer local completion missing');
    assert.ok(!outerLocals.items.some(i => i.label === 'scope_inner'));
    await replace(dut, packageText.replace('EXPORTED', 'UPDATED') + originalDut);
    const updated = await eventually(() => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', tb.uri, packagePosition, ':'), value => !!value?.items.some(i => i.label === 'UPDATED'), 'Unsaved package rename missing');
    assert.ok(!updated.items.some(i => i.label === 'EXPORTED'));
    assert.equal(await readFile(dut.uri.fsPath, 'utf8'), originalDut);
    await replace(dut, originalDut); await replace(tb, originalTb);
    console.log('RTL_SCOPE_TEST_PASS: package / imports / nested scopes / unsaved updates');

    // Disable and re-enable in this isolated profile, checking server teardown/restart.
    const config = vscode.workspace.getConfiguration('rtl');
    await config.update('editor.semantic', false, vscode.ConfigurationTarget.Global);
    await vscode.commands.executeCommand('rtl.restartLanguage');
    assert.ok(!vscode.languages.getDiagnostics(dut.uri).some(d => d.source === 'slang'));
    assert.equal((await vscode.commands.executeCommand<{label: string}>('rtl.getLanguageStatus', dut.uri.toString())).label, 'Disabled');
    await config.update('editor.semantic', undefined, vscode.ConfigurationTarget.Global);
    await vscode.commands.executeCommand('rtl.restartLanguage');
    const previousTools = config.get<string>('toolsDirectory');
    try {
      await config.update('toolsDirectory', vscode.Uri.joinPath(root, '.rtl/missing-language-tools').fsPath, vscode.ConfigurationTarget.Global);
      await vscode.commands.executeCommand('rtl.restartLanguage');
      const missing = await vscode.commands.executeCommand<{label: string; detail: string}>('rtl.getLanguageStatus', dut.uri.toString());
      assert.equal(missing.label, 'Tools missing');
      assert.ok(missing.detail.includes('missing-language-tools'));
    } finally {
      await config.update('toolsDirectory', previousTools, vscode.ConfigurationTarget.Global);
      await vscode.commands.executeCommand('rtl.restartLanguage');
    }
    const manifest = vscode.Uri.joinPath(root, 'rtl.toml').fsPath;
    const backup = manifest + '.status-test-backup';
    const originalManifest = await readFile(manifest, 'utf8');
    await rename(manifest, backup);
    try {
      await vscode.commands.executeCommand('rtl.restartLanguage');
      await eventually(() => vscode.commands.executeCommand<{label: string}>('rtl.getLanguageStatus', dut.uri.toString()), value => value?.label === 'Project not configured', 'Missing manifest status absent');
    } finally { await rename(backup, manifest); }
    try {
      await writeFile(manifest, 'version = [invalid');
      await vscode.commands.executeCommand('rtl.restartLanguage');
      await eventually(() => vscode.commands.executeCommand<{label: string}>('rtl.getLanguageStatus', dut.uri.toString()), value => value?.label === 'Analysis failed', 'Malformed manifest status absent');
    } finally {
      await writeFile(manifest, originalManifest);
      await vscode.commands.executeCommand('rtl.restartLanguage');
    }
    await eventually(() => vscode.commands.executeCommand<{label: string}>('rtl.getLanguageStatus', dut.uri.toString()), value => value?.label === 'Ready', 'Restored project status did not recover');
    console.log('RTL_PROJECT_STATUS_PASS: missing / malformed / restored manifest');
    console.log('RTL_LANGUAGE_STATUS_PASS: project / saved-file / unlisted / disabled / missing tools / effective path');
    console.log('RTL_SEMANTIC_TEST_PASS: unsaved completion / hover / definition / diagnostics / restart');
  } finally {
    await replace(dut, originalDut); await replace(tb, originalTb);
    await dut.save(); await tb.save();
  }
}
