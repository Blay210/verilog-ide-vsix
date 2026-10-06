import type { WaveSignal } from './model';
/** Structural input keeps this model independent of compiler and editor APIs. */
export interface TraceNode {
  id:string;kind:string;module?:string;instancePath?:string[];
  ports:{name:string;signalType?:{width?:number;simpleIntegral:boolean}}[];children:TraceNode[];
}
export interface TracePortBinding {
  instanceId:string;instancePath?:string[];port:string;
  state:'matched'|'missing'|'ambiguous'|'width-mismatch'|'unsupported';
  signalId?:string;code?:string;signalIds?:string[];reason?:string;
}
const clean = (name:string) => name.startsWith('\\') ? name.slice(1) : name;
const key = (parts:string[]) => JSON.stringify(parts.map(clean));
/** Exact segmented paths only. TOP is the sole supported backend wrapper.
 * No module-name / suffix / dot splitting / array-name guessing is permitted.
 */
export function mapTracePorts(design:{roots:TraceNode[]},signals:WaveSignal[],top:string):TracePortBinding[] {
  if(design.roots.length!==1 || design.roots[0].module!==top)throw Error('Trace mapping requires one selected recorded test top.');
  const nodes:TraceNode[]=[];
  function walk(node:TraceNode,depth:number) {
    if(depth>128 || nodes.length>=10000)throw Error('Trace hierarchy limit exceeded.');
    nodes.push(node);node.children.forEach(child=>walk(child,depth+1));
  }
  walk(design.roots[0],0);
  const scopes=signals.filter(signal=>signal.scopeSegments && signal.reference);
  const variants=[[],['TOP']].filter(prefix=>scopes.some(signal=>{
    const parts=signal.scopeSegments!.map(clean);return parts.length>=prefix.length+1 && key(parts.slice(0,prefix.length+1))===key([...prefix,top]);
  }));
  const paths=new Map<string,number>();
  for(const node of nodes)if(node.instancePath)paths.set(key(node.instancePath),(paths.get(key(node.instancePath))??0)+1);
  const index=new Map<string,WaveSignal[]>();
  for(const signal of scopes){const address=key([...signal.scopeSegments!,signal.reference!]);index.set(address,[...(index.get(address)??[]),signal]);}
  const bindings:TracePortBinding[]=[];
  for(const node of nodes)for(const port of node.ports) {
    if(bindings.length>=10000)throw Error('Trace port mapping limit exceeded.');
    const base={instanceId:node.id,instancePath:node.instancePath,port:port.name};
    if(!node.instancePath || node.instancePath.length<1 || clean(node.instancePath[0])!==top || !port.signalType?.simpleIntegral || !Number.isInteger(port.signalType.width) || port.signalType.width!<=0){
      bindings.push({...base,state:'unsupported',reason:'Exact semantic instance path and integral port width are required.'});continue;
    }
    if((paths.get(key(node.instancePath))??0)!==1 || variants.length>1){bindings.push({...base,state:'ambiguous',reason:'Multiple hierarchy paths or VCD root interpretations.'});continue;}
    const matches=variants.length?index.get(key([...variants[0],...node.instancePath,port.name]))??[]:[];
    if(!matches.length){bindings.push({...base,state:'missing',reason:'No exact recorded declaration for this port.'});continue;}
    if(matches.some(signal=>signal.range && !/^\[\s*-?\d+\s*:\s*-?\d+\s*\]$/.test(signal.range) || ['real','realtime','parameter'].includes(signal.type))){bindings.push({...base,state:'unsupported',reason:'Unsupported trace declaration shape/type.'});continue;}
    if(matches.some(signal=>signal.width!==port.signalType!.width)){bindings.push({...base,state:'width-mismatch',reason:'Recorded and elaborated widths differ.'});continue;}
    if(new Set(matches.map(signal=>signal.code)).size!==1){bindings.push({...base,state:'ambiguous',reason:'Multiple channels share this exact declaration path.'});continue;}
    bindings.push({...base,state:'matched',signalId:matches[0].id,code:matches[0].code,signalIds:matches.map(signal=>signal.id)});
  }
  return bindings;
}
