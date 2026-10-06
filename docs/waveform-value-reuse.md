# F1F: bounded normalized-value reuse

Historical next-step note: renderer instrumentation was subsequently completed for the default8-signal medium fixture in [F1G](waveform-render-profile.md). Maximum-row/bit and physical interaction acceptance remains open.

2026-10-06. Adopted in `packages/waveform/src/vcd.ts` after isolated comparison and native functional checks. This is a retained-memory optimization with a measured parse-time tradeoff, not a speed improvement or whole-F acceptance.

## Contract

Each parse owns a local normalized-bit-string map. Only validated/padded values of at most64 characters participate. The pool admits at most4096 distinct strings and65536 characters; a miss that would exceed either budget disables the pool for the rest of that parse. Existing transition references stay valid. Wide values bypass it, real spelling remains untouched, and no cache survives a parse or crosses readers. These budgets bound cache entries/characters, not exact V8 heap bytes.

No changes to source bytes, metadata/result models, trace identity, logical decoded-character/change limits, aliases, same-tick final-value collapse, exact timestamps or queries. Cache lookup is inline to avoid a function call on every value. The initial helper-call candidate had a substantial high-uniqueness slowdown and was replaced; its report is preserved as `.dev/value-reuse/run-rodS7r/report.json`.

## Controlled local comparison

```text
node --expose-gc scripts/compare-waveform-values.mjs
```

Requires the medium fixture in `.dev/waveform-scale-latest.json` (build then `scripts/verify-waveform-scale.mjs` if missing). The development harness builds reference/candidate from the same current source; reference removes only the marked pool declaration/value-reuse block. Review its asserted anchors if parser structure changes. Four alternating AB/BA pairs per input run in fresh sequential workers with worker-local diagnostic GC, no inspector, and no other test commands in parallel. It compares metadata and every channel/time/value digest, input SHA and actual exit0 for all24 workers. Production never forces GC. Fixed synthetic fixtures are not representative user designs.

Final run `.dev/value-reuse/run-GeCWoZ/report.json`, Node24.19.0 Windows; latest pointer `.dev/value-reuse-latest.json`.

| Input | Reference retained MiB | Candidate retained MiB | Reference median parse ms | Candidate median parse ms |
|---|---:|---:|---:|---:|
| 4096signals/786432changes, repeated8bit | 56.871 | 38.878 | 663.636 | 717.335 |
| 1024signals/65536changes, unique16bit | 5.544 | 5.545 | 58.669 | 57.442 |
| 1024signals/65536changes, unique256bit | 20.541 | 20.542 | 134.790 | 131.597 |

Repeated values save17.993MiB, about31.6% of retained data, at about53.7ms/+8.1% median parse time in this local run. Accepted as a memory/latency tradeoff for several-thousand-signal readers. This is not a claim of faster opening. Unique inputs do not show increased medians here, but individual runs have substantial variance (e.g. wide candidate105.8–147.8ms vs reference98.1–144.2ms); no portable guarantee or confidence interval is claimed. Heap deltas keep input text alive, measure live worker heap, and exclude process RSS/rendering.

## Regression and native verification

Relevant26 PASS/0 fail/skip, final typecheck exit0 and development build through the native runner exit0. Two new tests cover entry-budget saturation13bit/5000values, character saturation64bit/1100values,65bit bypass, independent parses, aliases, >Number-precision queries, X/Z padding, unchanged real spelling, same-tick collapse and invalid encodings. Existing tests retain identity/error/cancellation/enum/limits/disposal coverage.

Native command uses `VSCODE_EXECUTABLE=D:/Tools/Microsoft VS Code/Code.exe`, `RTL_DEV_HOME=.dev/rtl-dev`, `RTL_WAVEFORM_PROFILE_TEST=1`, then `node scripts/test-vscode.mjs` (no other suite flags). Receipt `.dev/vscode-tests/run-w4sxss/project/.rtl/extension-test.json`: passed/profileMode/sourceHashPreserved/pendingCloseRecovered=true, four two-editor cycles,9created/9exited readers, peer exact values, hostexit0. Native worker parse696.82–915.59ms, editor open779.53–1078.22ms, phase loop maximum41.75ms. Direct diagnostic query is not proof of webview roundtrip/first paint or physical Cancel-click performance.

RSS initial205.76MiB, peak419.09MiB, post-close346.50/369.63/354.38/364.37MiB, final386.06MiB. These numbers are lower than older runs but native conditions were not matched as an A/B experiment; don't attribute a percentage improvement or baseline recovery to this change. No forced GC in native host. Earlier900ms cause remains unresolved.

## Next

Measure renderer first-ready/canvas frame and actual webview query round trips under the existing medium fixture, separating them from editor-command completion and direct worker queries. Preserve normal UI contracts; diagnostics must be explicitly enabled. Continue physical interaction, representative user-design, actual editing-profile and recorded-structure gates. Native RSS return remains open; clean Windows is deferred for lack of a separatePC/VM. U12 discovery, internal FST, free node layout, independent IDE/compiler remain later stages. No VSIX/install/user examples changed.
