import type { HierarchyNode, SourcePoint } from '@rtl-dev/semantic';
import { instanceChildren, type StructureNavigationState } from './structure-navigation';
import { structureCanvasScript } from './structure-canvas';

const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const short = (value: string, length = 40) => escape(value.length > length ? value.slice(0, length - 1) + '…' : value);
export interface StructureTracePresentation { state: 'ready' | 'unavailable'; time: string; end: string; reason?: string }
/** Read-only presentation; source targets are resolved by the host, never by HTML paths. */
export function renderStructure(node: HierarchyNode, nonce: string, stale = false, options?: { navigation: StructureNavigationState; context: { project: string; root?: string; test?: string; top?: string; mode?: 'current' | 'recorded'; runId?: string; startedAt?: string }; trace?: StructureTracePresentation }): { html: string; links: Map<string, SourcePoint>; nodes: Map<string, HierarchyNode>; ports: Map<string, { instanceId: string; port: string }> } {
  const links = new Map<string, SourcePoint>(), nodes = new Map<string, HierarchyNode>();
  const observedPorts = new Map<string, { instanceId: string; port: string }>();
  const link = (label: string, point?: SourcePoint) => {
    if (!point?.file) return escape(label);
    const id = String(links.size); links.set(id, point);
    return `<button data-source="${id}" ${stale ? 'disabled' : ''}>${escape(label)}</button>`;
  };
  const navigation = options?.navigation;
  const rootIds = new Set(navigation?.roots ?? []);
  const role = (n: HierarchyNode) => rootIds.has(n.id) ? options?.context.test ? 'Test top' : 'Design top' : n.kind === 'instance' ? 'Module instance' : n.kind === 'generate' ? 'Generate scope' : 'Instance array';
  const childBlocks = instanceChildren(node);
  const blocks = childBlocks.length ? childBlocks : node.kind === 'instance' ? [node] : [];
  for (const n of [...navigation?.breadcrumbs ?? [], ...navigation?.choices.slice(0, 200) ?? []]) nodes.set(n.id, n);
  const breadcrumb = navigation?.breadcrumbs.map(n => `<button data-node="${escape(n.id)}" title="${escape(n.id)}" ${stale || n.id === node.id ? 'disabled' : ''}>${escape(n.name)}</button>`).join('<span aria-hidden="true"> / </span>') ?? '';
  const recorded = options?.context.mode === 'recorded';
  const trace = recorded ? options?.trace : undefined;
  const traceToolbar = trace ? `<section class="toolbar" aria-label="Recorded values"><label>Time <input id="trace-time" aria-label="Recorded time" value="${escape(trace.time)}" ${stale || trace.state !== 'ready' ? 'disabled' : ''}></label><button data-action="traceTime" ${stale || trace.state !== 'ready' ? 'disabled' : ''}>Go</button><button data-action="traceWave" ${stale || trace.state !== 'ready' ? 'disabled' : ''}>Open linked waveform</button><span id="trace-status" role="status">${escape(trace.state === 'ready' ? `Values at ${trace.time} · End ${trace.end} · Shared with waveform cursor` : trace.reason ?? 'Trace unavailable')}</span></section>` : '';
  const context = options ? `<p class="context">${recorded ? `Recorded run · ${escape(options.context.runId ?? '')}${options.context.startedAt ? ` · ${escape(options.context.startedAt)}` : ''}` : 'Current design'}<br>${escape(options.context.project)} · ${escape(options.context.test ? `Test: ${options.context.test}` : 'Design roots')}${options.context.top ? ` · Top: ${escape(options.context.top)}` : ''} <button data-action="context">${recorded ? 'Explore current design…' : 'Change test…'}</button></p>` : '';
  const toolbar = navigation ? `<nav class="toolbar" aria-label="Structure navigation">
    <button data-action="back" ${stale || !navigation.canBack ? 'disabled' : ''}>← Back</button>
    <button data-action="forward" ${stale || !navigation.canForward ? 'disabled' : ''}>Forward →</button>
    <button data-action="up" ${stale || !navigation.parent ? 'disabled' : ''} title="${escape(navigation.parent?.id ?? 'At design root')}">↑ Up</button>
    <label>View <select data-scope ${stale ? 'disabled' : ''}><option value="" selected disabled>${escape(`${role(node)} · ${node.id}`)}</option>${navigation.choices.slice(0,200).map(n => `<option value="${escape(n.id)}">${escape(`${role(n)} · ${n.id}`)}</option>`).join('')}</select></label>
    <button data-action="refresh">Refresh</button></nav>${navigation.choices.length > 200 ? '<p>More instances are available in the Hierarchy tree.</p>' : ''}<nav class="breadcrumbs" aria-label="Instance path">${breadcrumb}</nav>` : '<button data-action="refresh">Refresh structure</button>';
  let y = 30, svg = '', rows = '', shown = 0;
  for (const block of blocks) {
    if (shown >= 200) break;
    nodes.set(block.id, block);
    const ports = block.ports.slice(0, 200 - shown); shown += ports.length || 1;
    const height = Math.max(90, 58 + ports.length * 36);
    svg += `<g ${block.id !== node.id ? `data-node="${escape(block.id)}" role="button" tabindex="${stale ? '-1' : '0'}" aria-disabled="${stale}" aria-label="View inside ${escape(block.id)}" class="scope"` : ''}><rect x="500" y="${y}" width="450" height="${height}" rx="8" class="block"/>
      <text x="518" y="${y + 25}" class="heading"><title>${escape(block.id)}</title>${short(block.id, 54)}</text>
      <text x="518" y="${y + 45}" class="muted">${short(block.module ?? '', 54)}</text>`;
    for (const [index, port] of ports.entries()) {
      const valueId = String(observedPorts.size); observedPorts.set(valueId, { instanceId: block.id, port: port.name });
      const py = y + 74 + index * 36, connection = port.connection;
      const connected = connection.kind === 'expression';
      const label = connection.kind === 'top' ? 'Top-level port' : connection.kind === 'unconnected' ? 'Unconnected' : connection.text;
      const sourceId = connection.location?.file ? String(links.size) : undefined;
      if (sourceId) links.set(sourceId, connection.location!);
      svg += `<rect x="15" y="${py - 20}" width="330" height="28" rx="4" class="signal"/>
        <text x="26" y="${py}" ${sourceId ? `data-source="${sourceId}"` : ''}><title>${escape(label)}</title>${short(label)}</text>
        <text x="520" y="${py}"><title>${escape(`${port.name}: ${port.direction} ${port.type}`)}</title>${short(`${port.name} · ${port.direction} ${port.type}`, trace ? 34 : 50)}</text>${trace ? `<text x="825" y="${py}" data-port-value="${valueId}">${trace.state === 'ready' && !stale ? '…' : 'Unavailable'}</text>` : ''}`;
      if (connected) svg += `<path d="M 345 ${py - 5} H 495" class="wire" ${['input', 'inout'].includes(port.direction) ? 'marker-end="url(#arrow)"' : ''} ${['output', 'inout'].includes(port.direction) ? 'marker-start="url(#back)"' : ''}/>`;
      rows += `<tr><td>${escape(block.id)}</td><td>${link(port.name, port.location)}<br><small>${escape(`${port.direction} ${port.type}`)}</small></td><td>${link(label, connection.location)}<br>${connection.references.map(r => link(r.path, r.location)).join(' ')}</td>${trace ? `<td data-port-value="${valueId}">${trace.state === 'ready' && !stale ? '…' : 'Unavailable'}</td>` : ''}</tr>`;
    }
    svg += '</g>'; y += height + 28;
  }
  const params = node.parameters.map(p => `<tr><td>${link(p.name, p.location)}</td><td>${escape(p.value)}</td><td>${p.overridden ? 'Override' : p.local ? 'Local' : 'Default'}</td></tr>`).join('');
  const cameraKey=escape(JSON.stringify([options?.context.root ?? options?.context.project ?? '',options?.context.mode ?? 'current',options?.context.runId ?? '',options?.context.test ?? '',node.id]));
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';"><meta name="viewport" content="width=device-width,initial-scale=1">
  <style nonce="${nonce}">
  body{font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background);padding:18px}h1{font-size:21px;overflow-wrap:anywhere}button{color:var(--vscode-textLink-foreground);background:transparent;border:0;cursor:pointer;padding:3px;text-align:left;font:inherit}button:focus{outline:1px solid var(--vscode-focusBorder)}button:disabled{opacity:.5;cursor:default}table{border-collapse:collapse;width:100%;margin:14px 0}td,th{border-bottom:1px solid var(--vscode-panel-border);padding:9px;text-align:left;overflow-wrap:anywhere}small,.muted{opacity:.7}.canvas{overflow:auto}svg{width:100%;min-width:780px}text{fill:var(--vscode-foreground);font:13px var(--vscode-editor-font-family)}.heading{font-weight:bold;cursor:pointer;fill:var(--vscode-textLink-foreground)}.block{fill:var(--vscode-editorWidget-background);stroke:var(--vscode-focusBorder)}.signal{fill:var(--vscode-input-background);stroke:var(--vscode-panel-border)}.wire{fill:none;stroke:var(--vscode-textLink-foreground);stroke-width:1.5}marker path{fill:var(--vscode-textLink-foreground)}[data-source]{cursor:pointer}.notice{padding:12px;border-left:3px solid var(--vscode-focusBorder)}
  .toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.toolbar button{padding:6px 9px;background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground);border-radius:4px}.toolbar label{display:flex;gap:7px;align-items:center;min-width:0}.toolbar select{max-width:440px;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-panel-border);padding:5px;font:inherit}.breadcrumbs{margin-top:16px;overflow-wrap:anywhere}.context{opacity:.85}.scope{cursor:pointer}.scope:focus .block{stroke-width:3}.inside{display:flex;gap:10px;flex-wrap:wrap}
  .toolbar input{background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-panel-border);padding:6px;font:inherit;width:150px}[data-port-value]{font-family:var(--vscode-editor-font-family);overflow-wrap:anywhere}
  .canvas{height:clamp(320px,65vh,720px);overflow:hidden;border:1px solid var(--vscode-panel-border);border-radius:6px;background:var(--vscode-editor-background);margin-top:8px}.canvas svg{display:block;width:100%;height:100%;min-width:0;touch-action:none;cursor:grab;user-select:none}.canvas svg.panning{cursor:grabbing}.canvas svg:focus-visible{outline:2px solid var(--vscode-focusBorder);outline-offset:-2px}.camera-help{font-size:12px;opacity:.75}#structure-zoom{min-width:4ch;font-variant-numeric:tabular-nums}
  </style></head><body>${context}${toolbar}${traceToolbar}<h1>${escape(node.id)}</h1>
  <p>${escape(node.module ?? node.kind)} · ${link('Open instance', node.location)} · ${link('Open definition', node.definition)}</p>
  <p class="notice">${stale ? recorded ? 'Recorded inputs changed or cannot be verified. Refresh before navigating.' : 'Sources changed. Refresh before navigating this snapshot.' : recorded ? 'Structure analyzed from retained run sources. Source links open read-only recorded files; current edits are not included. Values are recorded observations, not live simulator stepping.' : 'Read-only elaborated structure. Arrows show port direction; expressions are parent-scope bindings, not a synthesized circuit.'}</p>
  ${params ? `<h2>Parameters</h2><table><tr><th>Name</th><th>Elaborated value</th><th>Origin</th></tr>${params}</table>` : ''}
  ${childBlocks.length ? `<h2>Child modules</h2><p>Double-click a module card or choose View inside.</p><div class="inside">${blocks.filter(n => nodes.has(n.id)).map(n => `<button data-node="${escape(n.id)}" title="${escape(n.id)}" ${stale ? 'disabled' : ''}>View inside · ${escape(n.name)} <small>${escape(n.module ?? '')}</small></button>`).join('')}</div>` : '<p>No child modules in this scope. Port bindings are shown below; internal operations are not modeled.</p>'}
  <h2>Port connections</h2>${shown >= 200 ? '<p>View limited to 200 ports/blocks. Select a smaller instance in the hierarchy.</p>' : ''}
  <div class="toolbar" aria-label="Diagram camera"><button data-camera="out" aria-label="Zoom out">−</button><output id="structure-zoom" aria-label="Zoom level">100%</output><button data-camera="in" aria-label="Zoom in">+</button><button data-camera="fit" title="Fit all visible connections">Fit</button><span class="camera-help">Drag background to move · Scroll to zoom · Double-click a module to look inside</span></div>
  <div class="canvas"><svg id="structure-canvas" data-scene-width="980" data-scene-height="${Math.max(y,100)}" data-view-key="${cameraKey}" viewBox="0 0 980 ${Math.max(y, 100)}" tabindex="0" role="group" aria-label="Elaborated port connections. Drag background to pan, scroll to zoom; arrow keys move, plus and minus zoom, zero fits."><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z"/></marker><marker id="back" markerWidth="8" markerHeight="8" refX="1" refY="4" orient="auto"><path d="M8,0 L0,4 L8,8 Z"/></marker></defs><g id="structure-scene">${svg}</g></svg></div>
  ${rows ? `<table><tr><th>Instance</th><th>Port declaration</th><th>Binding / referenced declarations</th>${trace ? '<th>Value at cursor</th>' : ''}</tr>${rows}</table>` : '<p>No child port bindings in this scope.</p>'}
  <script nonce="${nonce}">const vscode=acquireVsCodeApi();const send=(action,id)=>vscode.postMessage({action,id,snapshot:'${nonce}'});
  ${structureCanvasScript}
  document.addEventListener('click',event=>{const e=event.target.closest('[data-source],[data-node],[data-action]');if(!e||e.disabled)return;if(e.dataset.action==='refresh'||e.dataset.action==='context')send(e.dataset.action);else if(!${stale}){if(e.dataset.action==='traceTime')send('traceTime',document.getElementById('trace-time').value);else if(e.dataset.action)send(e.dataset.action);else if(e.dataset.source!==undefined)send('source',e.dataset.source);else if(e.tagName.toLowerCase()==='button')send('node',e.dataset.node);}});
  document.addEventListener('dblclick',event=>{if(${stale}||event.target.closest('[data-source],button'))return;const e=event.target.closest('[data-node]');if(e)send('node',e.dataset.node);});
  document.addEventListener('keydown',event=>{const e=event.target.closest('g[data-node]');if(!${stale}&&e&&['Enter',' '].includes(event.key)){event.preventDefault();send('node',e.dataset.node);}});
  document.addEventListener('change',event=>{if(!${stale}&&event.target.matches('[data-scope]'))send('node',event.target.value);});
  ${trace ? `let revision=-1;window.addEventListener('message',event=>{const m=event.data;if(m.kind!=='traceValues'||m.snapshot!=='${nonce}'||m.revision<revision)return;revision=m.revision;document.getElementById('trace-time').value=m.time;document.getElementById('trace-status').textContent=m.status;document.querySelectorAll('[data-port-value]').forEach(e=>{const v=m.values[e.dataset.portValue];const text=v?.text??'Unavailable';e.textContent=e.tagName.toLowerCase()==='text'&&text.length>12?text.slice(0,11)+'…':text;e.setAttribute('title',v?.reason??text);});if(m.unavailable){document.getElementById('trace-time').disabled=true;document.querySelectorAll('[data-action="traceTime"],[data-action="traceWave"]').forEach(e=>e.disabled=true);}});document.getElementById('trace-time').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.target.disabled)send('traceTime',event.target.value);});send('traceReady');` : ''}</script></body></html>`;
  return { html, links, nodes, ports: observedPorts };
}
