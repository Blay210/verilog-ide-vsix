export type WaveformFormat = 'vcd' | 'fst' | 'none';
export interface TestTarget { name: string; top: string; sources: string[]; timeoutMs: number; tags?: string[] }
export interface Project {
  root: string; name: string; sources: string[]; includeDirs: string[];
  defines: Record<string, string>; backend: string; timing: boolean;
  waveform: WaveformFormat; tests: TestTarget[];
  packageSources?: string[]; packageOrder?: 'auto' | 'manifest'; jobs?: number;
}
export interface ProcessSpec { executable: string; args: string[]; cwd: string; env?: NodeJS.ProcessEnv }
export interface ProcessResult { code: number | null; output: string; cancelled: boolean }
export interface OperationContext { signal?: AbortSignal; onLog?: (text: string) => void }
export interface ToolCommand { executable: string; args: string[]; env: NodeJS.ProcessEnv }
export interface Toolchain { compiler: ToolCommand; viewer?: ToolCommand; description: string; pathAliasDirectory?: string }
export interface BuildRequest { project: Project; target: TestTarget; directory: string }
export interface BuildArtifact { executable: string; cwd: string; env?: NodeJS.ProcessEnv }
export interface SimulatorBackend {
  readonly id: string;
  readonly capabilities: { waveforms: readonly WaveformFormat[]; timing: boolean; inputSnapshot?: boolean };
  check(context?: OperationContext): Promise<void>;
  build(request: BuildRequest, context?: OperationContext): Promise<BuildArtifact>;
  run(artifact: BuildArtifact, context?: OperationContext): Promise<void>;
}
export interface WaveformProvider { open(file: string): Promise<void> }
export type TestStatus = 'passed' | 'failed' | 'cancelled' | 'timedOut';
export interface TestResult {
  name: string; top: string; status: TestStatus; durationMs: number;
  directory: string; log: string; source?: string; waveform?: string; message?: string;
  startedAt?: string; tags?: string[]; sources?: string[];
  runId?: string; inputIdentity?: InputIdentity; traceIdentity?: TraceIdentity;
  inputSnapshot?: { version: 1; state: 'ready' | 'unavailable'; fingerprint?: string; reason?: string };
}
/** A bounded observation of saved inputs, not an atomic source snapshot. */
export interface InputIdentity {
  version: 1; coverage: 'configured-inputs';
  state: 'observed-stable' | 'changed-during-run' | 'unavailable';
  fingerprint?: string; files?: { path: string; sha256: string }[];
  settings?: string; reason?: string;
}
export interface PackageGraph {
  declarations: { name: string; file: string; offset: number }[];
  references: { name: string; file: string; offset: number; explicit: boolean }[];
}
export interface PackageDependencyProvider { dependencies(project: Project, context?: OperationContext): Promise<PackageGraph> }

/** Recorded artifact bytes bound to one retained source context. Not a signature. */
export interface TraceIdentity {
  version: 1; state: 'ready' | 'unavailable'; reason?: string;
  runId?: string; inputFingerprint?: string; format?: 'vcd' | 'fst';
  file?: string; sha256?: string; bytes?: number;
}
