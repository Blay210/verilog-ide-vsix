import { createConnection, ProposedFeatures, TextDocuments, TextDocumentSyncKind, CompletionItemKind, DiagnosticSeverity, type Diagnostic, type InitializeParams } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { loadProject, type Project } from '@rtl-dev/core';
import { SlangProvider, enumCaseContext, planEnumCase, connectionPort, connectionRank, callableContext, callableSignature, parameterSignature, portSignature, portCompletions, symbolAt, symbolCompletionContext, type Analysis, type SemanticSymbol } from '@rtl-dev/semantic';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);
interface State { root: string; generation: number; project?: Project; abort?: AbortController; timer?: NodeJS.Timeout; pending?: Promise<void>; analysis?: Analysis; published: Set<string>; status?: string; detail?: string }
const states = new Map<string, State>();
let provider: SlangProvider;
const empty: Analysis = { modules: [], instances: [], diagnostics: [] };
function addRoot(uri: string) {
  if (!uri.startsWith('file:')) return;
  const root = fileURLToPath(uri);
  states.set(uri, { root, generation: 0, published: new Set() });
}
connection.onInitialize((params: InitializeParams) => {
  const options = params.initializationOptions;
  provider = new SlangProvider(options.python, options.bridge, options.cache);
  for (const folder of params.workspaceFolders ?? (params.rootUri ? [{ uri: params.rootUri }] : [])) addRoot(folder.uri);
  return { capabilities: { textDocumentSync: TextDocumentSyncKind.Full, completionProvider: { triggerCharacters: ['.', ':', '('] }, signatureHelpProvider: { triggerCharacters: ['(', ','], retriggerCharacters: [')'] }, codeActionProvider: { codeActionKinds: ['refactor.rewrite'] }, hoverProvider: true, definitionProvider: true, workspace: { workspaceFolders: { supported: true, changeNotifications: true } } } };
});
function clear(state: State) {
  for (const uri of state.published) connection.sendDiagnostics({ uri, diagnostics: [] });
  state.published.clear(); state.analysis = undefined; state.project = undefined;
}
function schedule(state: State) {
  state.status = "Analyzing"; state.detail = "Waiting for current source analysis.";
  state.generation++; state.abort?.abort(); clearTimeout(state.timer); clear(state);
  state.timer = setTimeout(() => { state.timer = undefined; void analyze(state); }, 250);
}
async function analyze(state: State): Promise<void> {
  const generation = state.generation;
  const abort = new AbortController(); state.abort = abort;
  const work = (async () => {
    try {
      const project = await loadProject(state.root);
      const overlays = documents.all().filter(d => d.uri.startsWith('file:')).map(d => ({ file: fileURLToPath(d.uri), text: d.getText() }));
      const result = await provider.analyze(project, overlays, abort.signal);
      if (generation !== state.generation || abort.signal.aborted) return;
      state.status = result.diagnostics.some(d => d.severity === "error") ? "Source errors" : "Ready";
      state.detail = "Analysis completed. See Problems for source diagnostics.";
      state.analysis = result;
      state.project = project;
      const grouped = new Map<string, Diagnostic[]>();
      for (const entry of result.diagnostics) {
        if (!entry.location.file) continue;
        const uri = pathToFileURL(entry.location.file).href;
        const start = { line: entry.location.line, character: entry.location.character };
        const list = grouped.get(uri) ?? [];
        list.push({ range: { start, end: { line: start.line, character: start.character + 1 } }, message: entry.message, source: 'slang', code: entry.code, severity: entry.severity === 'error' ? DiagnosticSeverity.Error : entry.severity === 'warning' ? DiagnosticSeverity.Warning : DiagnosticSeverity.Information });
        grouped.set(uri, list);
      }
      for (const [uri, diagnostics] of grouped) { connection.sendDiagnostics({ uri, diagnostics, version: documents.get(uri)?.version }); state.published.add(uri); }
    } catch (error) {
      if (abort.signal.aborted || generation !== state.generation) return;
      state.status = "Analysis failed"; state.detail = String(error);
      connection.console.error(String(error));
      // Missing manifests are normal in mixed workspaces; malformed manifests are actionable.
      if (String(error).includes('ENOENT') && String(error).includes('rtl.toml')) { state.status = 'Project not configured'; state.detail = 'Open the folder containing rtl.toml. Nested project discovery is not supported.'; return; }
      const uri = pathToFileURL(path.join(state.root, 'rtl.toml')).href;
      connection.sendDiagnostics({ uri, diagnostics: [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } }, message: `Semantic analysis: ${String(error)}`, severity: DiagnosticSeverity.Error, source: 'RTL' }] });
      state.published.add(uri);
    }
  })();
  state.pending = work;
  await work;
  if (state.pending === work) state.pending = undefined;
}
connection.onInitialized(() => {
  for (const state of states.values()) schedule(state);
  connection.workspace.onDidChangeWorkspaceFolders(event => {
    for (const folder of event.removed) { const state = states.get(folder.uri); if (state) { state.abort?.abort(); clearTimeout(state.timer); clear(state); states.delete(folder.uri); } }
    for (const folder of event.added) { addRoot(folder.uri); const state = states.get(folder.uri); if (state) schedule(state); }
  });
});
// Reanalyze all roots: a source/header may be shared across workspace folders.
const changed = () => { for (const state of states.values()) schedule(state); };
documents.onDidChangeContent(changed); documents.onDidClose(changed);
connection.onDidChangeWatchedFiles(changed);
async function snapshot(uri: string) {
  const document = documents.get(uri);
  if (!document || !uri.startsWith('file:')) return;
  const file = fileURLToPath(uri);
  const state = [...states.values()].filter(s => { const relative = path.relative(s.root, file); return !relative.startsWith('..') && !path.isAbsolute(relative); }).sort((a, b) => b.root.length - a.root.length)[0];
  if (!state) return;
  const generation = state.generation;
  if (state.timer) { clearTimeout(state.timer); state.timer = undefined; await analyze(state); }
  else await state.pending;
  if (generation !== state.generation || documents.get(uri)?.version !== document.version) return;
  return { document, file, analysis: state.analysis ?? empty, state, generation };
}
connection.onRequest('rtl/languageStatus', (params: { uri: string }) => {
  if (!params.uri.startsWith('file:')) return { label: 'Save file first', detail: 'Semantic analysis requires a saved project file.' };
  const file = fileURLToPath(params.uri);
  const state = [...states.values()].filter(s => { const r = path.relative(s.root, file); return r !== '..' && !r.startsWith('..' + path.sep) && !path.isAbsolute(r); }).sort((a, b) => b.root.length - a.root.length)[0];
  if (!state) return { label: 'Outside workspace', detail: 'Open the folder containing rtl.toml.' };
  const project = state.project;
  if (project) {
    const key = (f: string) => process.platform === 'win32' ? path.resolve(f).toLowerCase() : path.resolve(f);
    const listed = [...project.sources, ...(project.packageSources ?? []), ...project.tests.flatMap(t => t.sources)].some(f => key(f) === key(file));
    if (!listed) return { label: 'Not a listed source', detail: 'This file is not in manifest sources. Included headers may still be analyzed; header membership is not tracked yet.', root: state.root };
  }
  return { label: state.status ?? 'Starting', detail: state.detail ?? 'Waiting for analysis.', root: state.root };
});
connection.onCompletion(async (params, token) => {
  const current = await snapshot(params.textDocument.uri); if (!current) return [];
  const offset = current.document.offsetAt(params.position);
  const targetPort = connectionPort(current.analysis, current.file, current.document.getText(), offset);
  if (params.context?.triggerCharacter === '(' && !targetPort) return [];
  const result = portCompletions(current.analysis, current.file, current.document.getText(), offset);
  if (result.ports.length) return result.ports.map(port => ({ label: port.name, kind: CompletionItemKind.Field, detail: `${port.direction} ${port.type}`, textEdit: { range: { start: current.document.positionAt(result.start), end: current.document.positionAt(result.end) }, newText: port.name } }));
  const context = symbolCompletionContext(current.document.getText(), offset);
  if (!context || !current.state.project || token.isCancellationRequested) return [];
  const abort = new AbortController();
  const subscription = token.onCancellationRequested(() => abort.abort());
  const signal = current.state.abort ? AbortSignal.any([abort.signal, current.state.abort.signal]) : abort.signal;
  try {
    const overlays = documents.all().filter(d => d.uri.startsWith('file:')).map(d => ({ file: fileURLToPath(d.uri), text: d.getText() }));
    const symbols = await provider.complete(current.state.project, overlays, { file: current.file, offset, qualifier: context.qualifier }, signal);
    if (signal.aborted || current.generation !== current.state.generation) return [];
    const kinds: Record<SemanticSymbol['kind'], CompletionItemKind> = { variable: CompletionItemKind.Variable, constant: CompletionItemKind.Constant, type: CompletionItemKind.Class, function: CompletionItemKind.Function, module: CompletionItemKind.Module, package: CompletionItemKind.Module };
    return symbols.filter(s => s.name.startsWith(context.prefix)).map(symbol => {
      const rank = connectionRank(targetPort, symbol);
      return { label: symbol.name, kind: kinds[symbol.kind], detail: symbol.detail + (rank.reason ? ` · ${rank.reason}` : ''), sortText: targetPort ? rank.sortText : '0_' + symbol.name, textEdit: { range: { start: current.document.positionAt(context.start), end: current.document.positionAt(context.end) }, newText: symbol.name } };
    });
  } catch (error) {
    if (!signal.aborted) connection.console.error(`Completion: ${String(error)}`);
    return [];
  } finally { subscription.dispose(); }
});
connection.onCodeAction(async (params, token) => {
  if (params.context.only && !params.context.only.some(kind => 'refactor.rewrite'.startsWith(kind))) return [];
  const current = await snapshot(params.textDocument.uri); if (!current?.state.project) return [];
  const text = current.document.getText();
  const context = enumCaseContext(text, current.document.offsetAt(params.range.start));
  if (!context || token.isCancellationRequested) return [];
  const abort = new AbortController();
  const subscription = token.onCancellationRequested(() => abort.abort());
  const signal = current.state.abort ? AbortSignal.any([abort.signal, current.state.abort.signal]) : abort.signal;
  try {
    const overlays = documents.all().filter(d=>d.uri.startsWith('file:')).map(d=>({file:fileURLToPath(d.uri),text:d.getText()}));
    const symbols = await provider.complete(current.state.project,overlays,{file:current.file,offset:context.expressionOffset},signal);
    if (signal.aborted || current.generation !== current.state.generation) return [];
    const values = symbols.find(s=>s.name === context.expression && s.kind === 'variable')?.enumValues;
    if (!values) return [];
    // Infer indentation from the enclosing body; honor tabs/CRLF. Four spaces is the fallback.
    const indents = text.split(/\r?\n/).map(line=>/^[\t ]*/.exec(line)![0]).filter(i=>i.length > context.base.length && i.startsWith(context.base));
    const unit = indents.sort((a,b)=>a.length-b.length)[0]?.slice(context.base.length) ?? (context.base.includes('\t') ? '\t' : '    ');
    const edit = planEnumCase(text,context,values,unit,text.includes('\r\n') ? '\r\n' : '\n');
    if (!edit) return [];
    const position = current.document.positionAt(edit.offset);
    return [{title:'Generate enum case branches',kind:'refactor.rewrite',edit:{documentChanges:[{textDocument:{uri:current.document.uri,version:current.document.version},edits:[{range:{start:position,end:position},newText:edit.text}]}]}}];
  } catch (error) { if (!signal.aborted) connection.console.error(`Enum case: ${String(error)}`); return []; }
  finally { subscription.dispose(); }
});
connection.onSignatureHelp(async (params, token) => {
  const current = await snapshot(params.textDocument.uri); if (!current) return;
  const offset = current.document.offsetAt(params.position);
  let signature = parameterSignature(current.analysis, current.file, current.document.getText(), offset) ?? portSignature(current.analysis, current.file, current.document.getText(), offset);
  if (!signature && current.state.project) {
    const context = callableContext(current.document.getText(), offset);
    if (context && !token.isCancellationRequested) {
      const abort = new AbortController();
      const subscription = token.onCancellationRequested(() => abort.abort());
      const signal = current.state.abort ? AbortSignal.any([abort.signal, current.state.abort.signal]) : abort.signal;
      try {
        const overlays = documents.all().filter(d => d.uri.startsWith('file:')).map(d => ({ file: fileURLToPath(d.uri), text: d.getText() }));
        const symbols = await provider.complete(current.state.project, overlays, { file: current.file, offset: context.start, qualifier: context.qualifier }, signal);
        if (signal.aborted || current.generation !== current.state.generation) return;
        const symbol = symbols.find(s => s.name === context.name && s.callable);
        if (symbol) signature = callableSignature(symbol, context);
      } catch (error) { if (!signal.aborted) connection.console.error(`Signature help: ${String(error)}`); }
      finally { subscription.dispose(); }
    }
  }
  if (!signature) return;
  return { signatures: [{ label: signature.label, parameters: signature.parameters.map(label => ({ label })) }], activeSignature: 0, activeParameter: signature.parameters.length ? signature.activeParameter : undefined };
});
connection.onHover(async params => {
  const current = await snapshot(params.textDocument.uri); if (!current) return;
  const symbol = symbolAt(current.analysis, current.file, current.document.getText(), current.document.offsetAt(params.position));
  if (!symbol) return;
  const body = symbol.label + (symbol.ports ? ` (\n${symbol.ports.map(p => `  ${p.direction} ${p.type} ${p.name}`).join(',\n')}\n)` : '');
  return { contents: { kind: 'markdown', value: '```systemverilog\n' + body + '\n```' } };
});
connection.onDefinition(async params => {
  const current = await snapshot(params.textDocument.uri); if (!current) return;
  const symbol = symbolAt(current.analysis, current.file, current.document.getText(), current.document.offsetAt(params.position));
  if (!symbol?.location.file) return;
  const start = { line: symbol.location.line, character: symbol.location.character };
  return { uri: pathToFileURL(symbol.location.file).href, range: { start, end: start } };
});
connection.onShutdown(() => { for (const state of states.values()) { state.abort?.abort(); clearTimeout(state.timer); } });
documents.listen(connection); connection.listen();
