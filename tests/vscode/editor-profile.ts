import * as vscode from 'vscode';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { testEditor } from './editor';
import { testSemantic } from './semantic';

export async function testEditorProfile(): Promise<void> {
  const root = vscode.workspace.workspaceFolders![0].uri.fsPath;
  const input = JSON.parse(await readFile(path.join(root, '..', 'editor-profile-input.json'), 'utf8'));
  const peer = vscode.extensions.getExtension('mshr-h.veriloghdl');
  assert.ok(peer, 'Copied Verilog HDL extension must be loaded, not disabled');
  await peer.activate();
  assert.ok(peer.isActive);
  if (process.env.RTL_EDITOR_PROFILE_PHYSICAL === '1') {
    const directory = path.join(root, '.rtl');
    await mkdir(directory, { recursive: true });
    const cases = [
      { name: 'module Tab', initial: 'module', expected: 'module  (\n    \n);\n    \nendmodule', line: 0, character: 7 },
      { name: 'package Tab', initial: 'package', expected: 'package ;\n    \nendpackage', line: 0, character: 8 },
      { name: 'begin Tab', initial: 'begin', expected: 'beginend', line: 0, character: 5 },
      { name: 'begin Enter', initial: 'begin', expected: 'begin\n    \nend', line: 1, character: 4 }
    ];
    const observations = [];
    for (let index = 0; index < cases.length; index++) {
      const fixture = cases[index], file = path.join(directory, `physical-${index}.sv`);
      await writeFile(file, fixture.initial);
      const document = await vscode.workspace.openTextDocument(file);
      const editor = await vscode.window.showTextDocument(document);
      editor.options = { tabSize: 4, insertSpaces: true };
      const point = document.positionAt(fixture.initial.length);
      editor.selection = new vscode.Selection(point, point);
      await new Promise(resolve => setTimeout(resolve, 200));
      await writeFile(path.join(directory, 'editor-physical-ready.json'), JSON.stringify({ index, name: fixture.name, file }));
      const deadline = Date.now() + 180000;
      let advanced = false;
      while (Date.now() < deadline) {
        try { advanced = JSON.parse(await readFile(path.join(directory, 'editor-physical-next.json'), 'utf8')).index === index; } catch { /* Wait for observer acknowledgement. */ }
        if (advanced) break;
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      assert.ok(advanced, `Physical input not acknowledged: ${fixture.name}`);
      assert.equal(document.getText().replaceAll('\r\n', '\n'), fixture.expected, fixture.name);
      assert.equal(editor.selection.active.line, fixture.line, fixture.name);
      assert.equal(editor.selection.active.character, fixture.character, fixture.name);
      observations.push({ name: fixture.name, text: document.getText(), line: editor.selection.active.line, character: editor.selection.active.character });
      await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
    }
    await writeFile(path.join(directory, 'extension-test.json'), JSON.stringify({ passed: true, editorProfile: true, physicalKeys: true, observations, peer: { id: peer.id, active: peer.isActive }, input }, null, 2));
    return;
  }
  await testEditor();
  await testSemantic();
  await mkdir(path.join(root, '.rtl'), { recursive: true });
  await writeFile(path.join(root, '.rtl', 'extension-test.json'), JSON.stringify({
    passed: true, editorProfile: true, lexicalCommands: true, semantic: true,
    peer: { id: peer.id, version: peer.packageJSON.version, active: peer.isActive },
    physicalKeys: false, input
  }, null, 2));
  console.log('RTL_EDITOR_PROFILE_PASS: copied default editing settings / active Verilog HDL peer / editor and semantic commands');
}
