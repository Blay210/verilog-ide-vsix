import * as vscode from 'vscode';
import path from 'node:path';
import { loadRecordedInputs, type TestResult } from '@rtl-dev/core';

const key = (file: string) => process.platform === 'win32' ? path.resolve(file).toLowerCase() : path.resolve(file);

/** Read-only source viewing shared by result actions and archived hierarchy navigation. */
export function registerRecordedSources(context: vscode.ExtensionContext): void {
  const documents = new Map<string, { result: TestResult; file: string }>();
  async function verified(result: TestResult, requested?: string) {
    const saved = await loadRecordedInputs(result);
    const file = requested ?? saved.target.sources[0];
    const mapping = saved.sourceMappings.find(source => key(source.recorded) === key(file));
    if (!mapping) throw Error('Source is not part of this recorded run.');
    return { saved, mapping };
  }
  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('rtl-recorded', {
    async provideTextDocumentContent(uri) {
      const entry = documents.get(uri.toString());
      if (!entry) throw Error('Recorded source context is no longer available.');
      const { mapping } = await verified(entry.result, entry.file);
      return Buffer.from(await vscode.workspace.fs.readFile(vscode.Uri.file(mapping.recorded))).toString('utf8');
    }
  }), vscode.commands.registerCommand('rtl.openRecordedSource', async (result: TestResult, requested?: string, point?: { line: number; character: number }) => {
    const { saved, mapping } = await verified(result, requested);
    const uri = vscode.Uri.from({ scheme: 'rtl-recorded', path: `/${saved.runId}/${path.relative(saved.project.root, mapping.recorded).replaceAll('\\', '/')}`,
      query: new URLSearchParams({ run: result.directory }).toString() });
    documents.set(uri.toString(), { result, file: mapping.recorded });
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.languages.setTextDocumentLanguage(document, /\.(sv|svh)$/i.test(mapping.recorded) ? 'systemverilog' : 'verilog');
    const position = point ? new vscode.Position(point.line, point.character) : undefined;
    await vscode.window.showTextDocument(document, { preview: true, ...(position ? { selection: new vscode.Range(position, position) } : {}) });
    return uri.toString();
  }), { dispose() { documents.clear(); } });
}
