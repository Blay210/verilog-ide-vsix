import type { HierarchyNode } from '@rtl-dev/semantic';

/** Immediate module children, through generate/array containers, never through another module. */
export function instanceChildren(node: HierarchyNode): HierarchyNode[] {
  return node.children.flatMap(child => child.kind === 'instance' ? [child] : instanceChildren(child));
}
export interface StructureNavigationState {
  current?: string;
  breadcrumbs: HierarchyNode[];
  parent?: HierarchyNode;
  canBack: boolean;
  canForward: boolean;
  roots: string[];
  choices: HierarchyNode[];
}

/** Host-independent navigation over actual elaborated relationships; IDs are never split on dots. */
export class StructureNavigation {
  private nodes = new Map<string, HierarchyNode>();
  private parents = new Map<string, HierarchyNode>();
  private roots: HierarchyNode[] = [];
  private history: string[] = [];
  private cursor = -1;
  private context?: string;
  get current(): string | undefined { return this.history[this.cursor]; }
  node(id: string): HierarchyNode | undefined { return this.nodes.get(id); }
  parent(id: string): HierarchyNode | undefined { return this.parents.get(id); }

  update(roots: HierarchyNode[], context: string): void {
    const previous = this.state().breadcrumbs.map(node => node.id).reverse();
    const nodes = new Map<string, HierarchyNode>(), parents = new Map<string, HierarchyNode>();
    const stack = roots.map(node => ({node, parent: undefined as HierarchyNode | undefined}));
    while (stack.length) {
      const {node, parent} = stack.pop()!;
      if (nodes.has(node.id)) throw Error(`Duplicate hierarchy identity: ${node.id}`);
      nodes.set(node.id, node); if (parent) parents.set(node.id, parent);
      for (const child of node.children) stack.push({node: child, parent: node});
    }
    this.nodes = nodes; this.parents = parents; this.roots = roots;
    if (this.context !== context) {
      this.context = context; this.history = []; this.cursor = -1;
      if (roots.length) this.visit(roots[0].id);
      return;
    }
    const current = this.current;
    const kept = this.history.map((id, index) => ({id, index})).filter(entry => nodes.has(entry.id));
    const cursor = kept.filter(entry => entry.index <= this.cursor).length - 1;
    this.history = kept.map(entry => entry.id); this.cursor = cursor;
    if (!current || !nodes.has(current)) {
      const fallback = previous.find(id => nodes.has(id)) ?? roots[0]?.id;
      if (fallback) this.visit(fallback);
      else { this.history = []; this.cursor = -1; }
    }
  }
  visit(id: string): void {
    if (!this.nodes.has(id)) throw Error('Select an instance in the current hierarchy.');
    if (id === this.current) return;
    this.history = this.history.slice(0, this.cursor + 1);
    this.history.push(id); this.cursor = this.history.length - 1;
  }
  back(): void { if (this.cursor > 0) this.cursor--; }
  forward(): void { if (this.cursor + 1 < this.history.length) this.cursor++; }
  up(): void { const parent = this.current && this.parents.get(this.current); if (parent) this.visit(parent.id); }
  state(): StructureNavigationState {
    const breadcrumbs: HierarchyNode[] = [];
    let node = this.current ? this.nodes.get(this.current) : undefined;
    while (node) { breadcrumbs.unshift(node); node = this.parents.get(node.id); }
    return {
      current: this.current, breadcrumbs, parent: this.current ? this.parents.get(this.current) : undefined,
      canBack: this.cursor > 0, canForward: this.cursor + 1 < this.history.length,
      roots: this.roots.map(node => node.id), choices: this.roots.flatMap(root => [root, ...instanceChildren(root)])
    };
  }
}
