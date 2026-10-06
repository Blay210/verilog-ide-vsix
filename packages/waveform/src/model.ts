/** Decimal strings preserve timestamps across JSON and editor IPC. */
export interface Timescale { magnitude: number; unit: 's' | 'ms' | 'us' | 'ns' | 'ps' | 'fs' }
export interface WaveSignal { id: string; code: string; name: string; scope: string; path: string; width: number; type: string; scopeSegments?: string[]; reference?: string; range?: string }
export interface Change { time: string; value: string }
export interface WaveMetadata { signals: WaveSignal[]; timescale: Timescale; end: string; changes: number; warnings: string[]; enumLabels?: Record<string, Record<string, string>> }
/** Identity of the bytes actually parsed by a worker, not a file-path assertion. */
export interface VerifiedWaveMetadata { metadata: WaveMetadata; sha256: string; bytes: number }
export interface ValuesRequest { signals: string[]; cursor: string }
export interface WaveValues { cursor: string; rows: { id: string; value: string }[] }
export interface WaveData extends WaveMetadata { channels: Map<string, Change[]> }
export interface WindowRequest { signals: string[]; from: string; to: string; cursor: string; pixels: number }
export interface WaveRow { id: string; value: string; initial: string; changes: Change[]; dense: boolean; buckets?: { from: string; to: string; value: string; edges: number }[] }
export interface WaveWindow { from: string; to: string; cursor: string; rows: WaveRow[] }
export type Radix = 'auto' | 'hex' | 'unsigned' | 'signed' | 'binary';
export const LIMITS = { bytes: 32 * 1024 * 1024, signals: 10000, changes: 1000000, width: 16384, selected: 32, pixels: 1600 };
