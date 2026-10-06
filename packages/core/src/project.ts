import path from 'node:path';
import type { Project, PackageGraph, PackageDependencyProvider, OperationContext, TestTarget } from './model';
const key = (file: string) => process.platform === 'win32' ? path.resolve(file).toLowerCase() : path.resolve(file);

export function orderPackages(project: Project, graph: PackageGraph): Project {
  const files = project.packageSources ?? [];
  const nodes = new Map(files.map(file => [key(file), file]));
  const definitions = new Map<string, PackageGraph['declarations'][number]>();
  for (const declaration of graph.declarations) {
    if (definitions.has(declaration.name)) throw Error(`Duplicate package: ${declaration.name}`);
    definitions.set(declaration.name, declaration);
  }
  const dependencies = new Map(files.map(file => [key(file), new Set<string>()]));
  for (const reference of graph.references) {
    const definition = definitions.get(reference.name);
    if (!definition) {
      if (reference.explicit && reference.name !== 'std') throw Error(`Unknown package '${reference.name}' imported by ${reference.file}`);
      continue; // A scoped name can also designate a class; leave it to elaboration.
    }
    const from = key(reference.file), to = key(definition.file);
    if (from === to) {
      if (reference.offset < definition.offset) throw Error(`Package '${reference.name}' is used before its declaration inside ${reference.file}. Split or reorder this file; file ordering cannot repair it.`);
    } else if (nodes.has(from)) {
      if (!nodes.has(to)) throw Error(`Package '${reference.name}' must be listed in sources.packages: ${definition.file}`);
      dependencies.get(from)!.add(to);
    }
  }
  const ordered: string[] = [], done = new Set<string>();
  while (ordered.length < files.length) {
    const ready = files.find(file => !done.has(key(file)) && [...dependencies.get(key(file))!].every(dep => done.has(dep)));
    if (!ready) throw Error(`Package dependency cycle among: ${files.filter(f => !done.has(key(f))).join(', ')}`);
    ordered.push(ready); done.add(key(ready));
  }
  return { ...project, sources: [...ordered, ...project.sources.filter(file => !nodes.has(key(file)))], packageOrder: 'manifest' };
}
export async function prepareProject(project: Project, provider?: PackageDependencyProvider, context: OperationContext = {}): Promise<Project> {
  if (project.packageOrder !== 'auto' || !project.packageSources?.length) return project;
  if (!provider) throw Error('Automatic package ordering needs slang. Set up RTL language support, or explicitly set sources.package_order="manifest".');
  return orderPackages(project, await provider.dependencies(project, context));
}
export function selectTests(project: Project, selection: { name?: string; tags?: string[] } = {}): TestTarget[] {
  const found = project.tests.filter(t => (!selection.name || t.name === selection.name) && (!selection.tags?.length || selection.tags.every(tag => t.tags?.includes(tag))));
  if (!found.length) throw Error('No tests match the requested name/tags.');
  return found;
}
