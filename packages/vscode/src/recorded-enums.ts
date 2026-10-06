import { loadRecordedInputs, type TestResult } from '@rtl-dev/core';
import type { SemanticProvider } from '@rtl-dev/semantic';
import { mapTraceEnums, type WaveMetadata } from '@rtl-dev/waveform';

/** Elaborate only retained inputs, then revalidate before publishing presentation data. */
export async function recordedEnums(result: TestResult, metadata: WaveMetadata, provider: SemanticProvider, signal: AbortSignal) {
  signal.throwIfAborted();
  const inputs = await loadRecordedInputs(result, signal);
  const design = await provider.hierarchy(inputs.project, result.name, [], signal);
  await loadRecordedInputs(result, signal);
  signal.throwIfAborted();
  if (design.diagnostics.some(d => d.severity === 'error')) throw Error('Recorded RTL enum analysis has errors.');
  return mapTraceEnums(design, metadata.signals, result.top);
}
