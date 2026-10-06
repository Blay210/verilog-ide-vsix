import type { WaveSignal } from './model';
import { mapTracePorts, type TraceNode } from './trace-map';

export interface EnumTraceNode extends TraceNode {
  enumSignals?: { name: string; width: number; values: { name: string; bits: string }[] }[];
  children: EnumTraceNode[];
}
/** Reuse exact-path/width/ambiguity rules. Maps declarations, never shared channel codes. */
export function mapTraceEnums(design: { roots: EnumTraceNode[] }, signals: WaveSignal[], top: string): Record<string, Record<string, string>> {
  const definitions = new Map<string, Record<string, string>>();
  let count = 0;
  function convert(node: EnumTraceNode, depth: number): TraceNode {
    if (depth > 128 || ++count > 10000) throw Error('Enum hierarchy limit exceeded.');
    const ports = (node.enumSignals ?? []).map(e => {
      const labels: Record<string, string> = Object.create(null);
      const valid = Number.isInteger(e.width) && e.width > 0 && e.width <= 256 && e.values.length > 0 && e.values.length <= 256 && e.values.every(v => {
        if (v.bits.length !== e.width || !/^[01]+$/.test(v.bits) || !v.name || v.name.length > 256 || Object.hasOwn(labels, v.bits)) return false;
        labels[v.bits] = v.name; return true;
      });
      const key = JSON.stringify([node.id, e.name]);
      if (valid && !definitions.has(key)) definitions.set(key, labels);
      else definitions.set(key, {});
      return { name: e.name, signalType: { width: e.width, simpleIntegral: valid } };
    });
    return { ...node, ports, children: node.children.map(child => convert(child, depth + 1)) };
  }
  const nodes = design.roots.map(root => convert(root, 0));
  const result: Record<string, Record<string, string>> = Object.create(null);
  for (const binding of mapTracePorts({ roots: nodes }, signals, top)) {
    const labels = definitions.get(JSON.stringify([binding.instanceId, binding.port]));
    if (binding.state === 'matched' && labels && Object.keys(labels).length) {
      for (const id of binding.signalIds ?? []) result[id] = labels;
    }
  }
  return result;
}
