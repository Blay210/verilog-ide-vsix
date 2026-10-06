import type { Project } from '@rtl-dev/core';
export interface SourcePoint { file: string; offset: number; line: number; character: number }
export interface SignalType { text: string; width?: number; signed?: boolean; fourState?: boolean; simpleIntegral: boolean }
export interface Port { name: string; direction: string; type: string; location: SourcePoint; signalType?: SignalType }
export interface ModuleParameter { name: string; type: string; defaultValue: string }
export interface ModuleInfo { name: string; kind: string; location: SourcePoint; ports: Port[]; parameters?: ModuleParameter[] }
export interface InstanceInfo { name: string; module: string; start: SourcePoint; end: SourcePoint; ports: Port[]; parameterStart?: SourcePoint; parameterEnd?: SourcePoint }
export interface SemanticDiagnostic { location: SourcePoint; severity: 'error' | 'warning' | 'note'; message: string; code: string }
export interface Analysis { modules: ModuleInfo[]; instances: InstanceInfo[]; diagnostics: SemanticDiagnostic[] }
export interface DocumentOverlay { file: string; text: string }
export interface SemanticQuery { file: string; offset: number; qualifier?: string }
export interface CallableInfo { kind: string; returnType: string; arguments: { name: string; label: string }[] }
export interface SemanticSymbol { name: string; kind: 'variable' | 'constant' | 'type' | 'function' | 'module' | 'package'; detail: string; location: SourcePoint; callable?: CallableInfo; signalType?: SignalType; enumValues?: { name: string; value: string }[] }
export interface ParameterValue { name: string; value: string; overridden: boolean; local: boolean; location: SourcePoint }
export interface PortBinding extends Port {
  connection: { kind: 'expression' | 'unconnected' | 'interface' | 'top'; text: string; location?: SourcePoint;
    references: { name: string; path: string; location: SourcePoint }[] };
}
export interface HierarchyNode {
  enumSignals?: { name: string; width: number; values: { name: string; bits: string }[] }[];
  instancePath?: string[]; id: string; name: string; kind: 'instance' | 'generate' | 'array'; module?: string;
  location: SourcePoint; definition?: SourcePoint; parameters: ParameterValue[]; ports: PortBinding[]; children: HierarchyNode[];
}
export interface DesignHierarchy { test?: string; roots: HierarchyNode[]; diagnostics: SemanticDiagnostic[] }
export interface SemanticProvider {
  analyze(project: Project, overlays: DocumentOverlay[], signal?: AbortSignal): Promise<Analysis>;
  complete(project: Project, overlays: DocumentOverlay[], query: SemanticQuery, signal?: AbortSignal): Promise<SemanticSymbol[]>;
  hierarchy(project: Project, test: string | undefined, overlays: DocumentOverlay[], signal?: AbortSignal): Promise<DesignHierarchy>;
}
