import path from 'node:path';
import { mkdir, mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { checkedProcess, orderPackages, type Project, type PackageGraph, type OperationContext } from '@rtl-dev/core';
import type { Analysis, DocumentOverlay, SemanticProvider, SemanticQuery, SemanticSymbol, DesignHierarchy } from './model';

// The same public dump switches are used by the simulator and editor snapshots.
const defines = (project: Project) => ({ ...project.defines,
  ...(project.waveform !== 'none' ? { RTL_WAVEFORM: '1' } : {}),
  ...(project.waveform === 'fst' ? { RTL_FST: '1' } : {}) });

export class SlangProvider implements SemanticProvider {
  constructor(readonly python: string, readonly bridge: string, readonly cache: string) {}
  async dependencies(project: Project, context: OperationContext = {}, overlays: DocumentOverlay[] = []): Promise<PackageGraph> {
    await mkdir(this.cache, { recursive: true });
    const directory = await mkdtemp(path.join(this.cache, 'dependencies-'));
    try {
      const input = path.join(directory, 'input.json'), output = path.join(directory, 'output.json');
      await writeFile(input, JSON.stringify({ operation: 'dependencies', sources: project.sources, includeDirs: project.includeDirs, defines: defines(project), overlays }));
      await checkedProcess({ executable: this.python, args: ['-I', '-B', this.bridge, input, output], cwd: project.root }, { ...context, signal: context.signal ? AbortSignal.any([context.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
      return JSON.parse(await readFile(output, 'utf8')) as PackageGraph;
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
  async analyze(project: Project, overlays: DocumentOverlay[], signal?: AbortSignal): Promise<Analysis> {
    return this.evaluate(project, overlays, signal);
  }
  async hierarchy(project: Project, test: string | undefined, overlays: DocumentOverlay[], signal?: AbortSignal): Promise<DesignHierarchy> {
    const target = project.tests.find(t => t.name === test);
    if (test && !target || !test && project.tests.length) throw Error('Choose one registered test to elaborate its hierarchy.');
    const timeout = AbortSignal.timeout(15000);
    const operationSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
    operationSignal.throwIfAborted();
    if (project.packageOrder === 'auto' && project.packageSources?.length) project = orderPackages(project, await this.dependencies(project, { signal: operationSignal }, overlays));
    await mkdir(this.cache, { recursive: true });
    const directory = await mkdtemp(path.join(this.cache, 'hierarchy-'));
    try {
      const input = path.join(directory, 'input.json'), output = path.join(directory, 'output.json');
      await writeFile(input, JSON.stringify({ operation: 'hierarchy', sources: [...new Set([...project.sources, ...(target?.sources ?? [])])], top: target?.top, includeDirs: project.includeDirs, defines: defines(project), overlays }));
      await checkedProcess({ executable: this.python, args: ['-I', '-B', this.bridge, input, output], cwd: project.root }, { signal: operationSignal });
      return { ...JSON.parse(await readFile(output, 'utf8')) as DesignHierarchy, test };
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
  async complete(project: Project, overlays: DocumentOverlay[], query: SemanticQuery, signal?: AbortSignal): Promise<SemanticSymbol[]> {
    return (await this.evaluate(project, overlays, signal, query)).completions ?? [];
  }
  private async evaluate(project: Project, overlays: DocumentOverlay[], signal?: AbortSignal, query?: SemanticQuery): Promise<Analysis & { completions?: SemanticSymbol[] }> {
    if (project.packageOrder === 'auto' && project.packageSources?.length) project = orderPackages(project, await this.dependencies(project, { signal }, overlays));
    await mkdir(this.cache, { recursive: true });
    const directory = await mkdtemp(path.join(this.cache, 'analysis-'));
    try {
      const input = path.join(directory, 'input.json'), output = path.join(directory, 'output.json');
      const result: Analysis = { modules: [], instances: [], diagnostics: [] };
      const timeout = AbortSignal.timeout(15000);
      const operationSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
      // Testbenches are independent compilations, just as they are in simulation.
      // Two tests may legitimately declare identically named helpers or tops.
      const key = (file: string) => process.platform === 'win32' ? path.resolve(file).toLowerCase() : path.resolve(file);
      const matchingTests = query ? project.tests.filter(t => t.sources.some(f => key(f) === key(query.file))) : [];
      const groups = matchingTests.length ? matchingTests : project.tests.length ? project.tests : [{ sources: [], top: undefined }];
      let completions: SemanticSymbol[] | undefined;
      for (const group of groups) {
        await writeFile(input, JSON.stringify({ sources: [...new Set([...project.sources, ...group.sources])], top: group.top, includeDirs: project.includeDirs, defines: defines(project), overlays, query }));
        await checkedProcess({ executable: this.python, args: ['-I', '-B', this.bridge, input, output], cwd: project.root }, { signal: operationSignal });
        const current = JSON.parse(await readFile(output, 'utf8')) as Analysis & { completions?: SemanticSymbol[] };
        result.modules.push(...current.modules); result.instances.push(...current.instances); result.diagnostics.push(...current.diagnostics);
        if (query) {
          const symbols = current.completions ?? [];
          // Shared RTL may elaborate in more than one test context. Only agree on
          // names, types and declarations valid in every such context.
          completions = completions === undefined ? symbols : completions.filter(s => symbols.some(other => JSON.stringify(s) === JSON.stringify(other)));
        }
      }
      const unique = <T>(items: T[]): T[] => [...new Map(items.map(item => [JSON.stringify(item), item])).values()];
      return { modules: unique(result.modules), instances: unique(result.instances), diagnostics: unique(result.diagnostics), ...(query ? { completions } : {}) };
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
}
