# F1E: parser CPU, allocation and live worker heap

Historical checkpoint: the following next-step proposal was executed in [F1F bounded value reuse](waveform-value-reuse.md). Production now has bounded reuse; F1E results below describe the earlier unpooled parser.

2026-10-06. This completes the diagnostic measurement step, not F stability acceptance or a production optimization. Product parser/worker/UI behavior is unchanged. No VSIX, install, compiler change or user example edit.

## Reproduction and boundary

Build with `node scripts/build.mjs`. Reuse the medium fixture from `.dev/waveform-scale-latest.json`; if absent, generate it with `node scripts/verify-waveform-scale.mjs`. Then run:

```text
node --expose-gc scripts/profile-waveform-parser.mjs
```

The harness bundles the current parser/query sources and starts five sequential fresh workers: three plain, one CPU profiler, one allocation sampler. It requires worker-local GC, initializes parser modules with a tiny trace, reads the input before measurement, collects before the baseline and after parsing, then keeps parsed data alive through a verified query. Input text remains alive at the baseline/live/drop-data checkpoints. It verifies 4,096 signals, 786,432 transitions, the >Number-precision cursor/X/Z value, a digest of every channel/time/value, original source SHA, and successful worker exit. `passed` denotes these invariants only.

Results are under `.dev/parser-profile/run-SvRWin/report.json` and `.dev/parser-profile-latest.json`; raw `parse.cpuprofile` and `parse.heapprofile` are in the run directory. Node v24.19.0, Windows, Intel i5-1155G7. This is a standalone diagnostic Node process, not the native extension host v24.21.0 or the renderer. SHA-256 of the reused fixture: `3f278c9ead41d41538db8e3e34f96edc775e2cf24f3c8287437199660c389f13`.

## Observations

| Checkpoint, plain worker runs | heapUsed MiB |
|---|---:|
| Input text alive, before parse, after diagnostic GC | 18.592 |
| Parsed data alive, after diagnostic GC | 75.470 |
| Increment attributable to retained parsed data and parser state | 56.878 |
| After diagnostic value canonicalization, same data/hash/query | 57.533 |
| Drop parsed data, keep input text, after GC | 18.708 |
| Drop data and text, after GC | 6.759 |

The three plain runs agree on the retained increment. Dropping parsed data returns worker heap to within about 0.117 MiB of its input-held baseline. This is not proof that process RSS, native worker shutdown, two readers or the workbench return to baseline. Heap statistics are worker-local; `process.memoryUsage().rss` includes the whole process. Forced GC is diagnostic only and is never added to production.

The 786,432 transitions contain only 258 distinct normalized values. A **post-parse diagnostic experiment** replaces equal value strings with the same representative. It reduces retained heap by 17.937 MiB, about 31.5% of the original retained increment. Every time/value digest and the exact cursor query remain equal. The diagnostic map is unbounded for this known fixture and is not a proposed production cache. This experiment measures retained string costs, not the runtime or allocation costs of an interning lookup during parsing.

Plain parse durations in the final run: 1,908.93–2,042.37 ms. An earlier diagnostic-only run without the canonicalization experiment ranged 578.85–1,600.59 ms. Host/load conditions were not controlled; do not compare these to F1D's native 716–958 ms or claim a speed regression/improvement. Some unrelated regression/typecheck work overlapped the final overall harness run; no timing target is accepted here.

CPU sampling interval is requested at 1,000 microseconds. Top self-attributed frames in this run: `put` 548 samples, `parseVcd` 378, token `next` 103, GC 56, and the token regexp 44. These are statistical samples, with scheduling gaps and inspector start/stop overhead; the report's sample time deltas are not exact function CPU timings or exclusive parse wall time percentages.

Allocation sampling requests 32 KiB intervals and includes objects collected during minor/major GC. Sampled allocation estimate totals about 523.39 MiB across the parse profiling window. Dominant self-attributions are iterator `next` (~259.3 MiB), `put` (~132.3 MiB), and `parseVcd` (~109.1 MiB). This includes temporary allocations and statistical estimates, not live bytes or an exact count of strings/Change objects. Raw profiles retain caller trees for investigation; identical function names at different stack positions must not be confused. Profiler runs perturb time/heap and their live heap is excluded from the plain memory comparison.

## Validation and next step

Five worker exits, source/digest/value invariants and three canonicalization comparisons passed; harness exit0. Relevant regression: 24 PASS, 0 fail/skip; final typecheck and development build exit0. The checks cover ordinary/verified worker metadata and timings, four-state values, same-tick updates, cancellation/late results, peer cursor isolation, enum presentation, limits and actual worker disposal.

Next: prototype **bounded per-parse normalized-value reuse**, with a small entry/character budget and no cross-reader cache. Compare original/candidate in interleaved isolated plain runs, repeated and high-uniqueness/wide-value traces; preserve full digests, X/Z, real values, aliases, exact timestamps, same-tick collapse and limits. Adopt only if retained memory benefits survive those comparisons without unacceptable throughput or adversarial overhead. Iterator allocation is a separate subsequent candidate; the parser already uses `matchAll`, not a whole-file `split`.

Renderer first paint/physical interaction, representative user project, actual user editing profile, recorded structure boundaries and native post-close RSS remain open. Clean Windows is deferred because the user has no separate PC/VM. U12 discovery, U11 Explorer hover and independent IDE/simulator stages remain unchanged.
