# F1G: actual webview window roundtrips and drawing

Historical next-step note: [F1H maximum-row stress](waveform-render-stress.md) subsequently verified160 DOM rows, active/dense/zoom viewports and Reload equality, and fixed a one-second drawing stall. Dense latency/physical interaction remain open.

2026-10-06. Development-only renderer instrumentation and actual native webview checks are complete for the medium fixture's default8 selected signals. This does not complete F, physical interaction or maximum-row rendering acceptance. No VSIX/install/user-example change.

## What changed and how to reproduce

`render-profile.ts` records query send/receive, synchronous canvas draw completion and a double-requestAnimationFrame opportunity on the renderer's own monotonic clock. Disabled instances do not read clocks, schedule frames or send telemetry. Each init gets a new host nonce; loading revokes it. Pending request timestamps are capped at32 and emitted samples at16 per init. Superseded draws/reload callbacks are rejected and reported rows are capped at32. Diagnostics never enter user saved views.

The host enables diagnostics only when `RTL_WAVEFORM_RENDER_TEST=1` and extension mode is Development or Test. Hidden diagnostic commands are registered only then; Production mode cannot enable them through the flag. Telemetry is nonce/shape/number/size checked and stored only for the live document. The fixture-only probe sends a cursor time to the real webview, which uses its existing cursor/window path; no alternate direct-worker shortcut is used for renderer measurements. The existing direct worker peer query remains a separate lifecycle assertion.

PowerShell reproduction (set only this suite flag):

```powershell
$env:VSCODE_EXECUTABLE='D:/Tools/Microsoft VS Code/Code.exe'
$env:RTL_DEV_HOME=(Resolve-Path '.dev/rtl-dev').Path
$env:RTL_WAVEFORM_RENDER_TEST='1'
node scripts/test-vscode.mjs
```

The runner builds development output and opens an isolated generated project/profile; it does not install/package an extension. Reuses `.dev/waveform-scale-latest.json` medium VCD4096signals/786432changes, copied inside fixture `.rtl/`. If missing, build then `node scripts/verify-waveform-scale.mjs` generates it. Every editor is observed while visible before its peer opens, across four two-editor cycles.

## Final native evidence

Receipt: `.dev/vscode-tests/run-risLLx/project/.rtl/extension-test.json`, VS Code1.140.0/extension host Node24.21.0 Windows. passed/renderMode/profileMode/pendingCloseRecovered/sourceHashPreserved=true; hostexit0. Eight editors,32 accepted visible renderer samples: one initial frame plus three cursor probes each. All probes assert signal0's raw value at exact >Number-precision times, including `zzzzzzzz`.9created/9exited workers; peer values, loading-tab close/reopen and source SHA preserved.

| Renderer interval | Samples | Min ms | Median ms | Max ms |
|---|---:|---:|---:|---:|
| Window request send→response handler (before draw) | 32 | 5.80 | 7.75 | 13.10 |
| Synchronous canvas drawing | 32 | 2.60 | 4.65 | 12.80 |
| Init received→first draw complete | 8 | 54.10 | — | 89.80 |
| Init received→first double-RAF opportunity | 8 | 62.10 | — | 97.70 |
| Host init sent→first telemetry received | 8 | 118.44 | — | 157.25 |

Request roundtrip includes renderer/host messaging, queueing, worker query/serialization and scheduling; it is not pure IPC. Init-to-frame excludes file reading/parsing, iframe startup and host→renderer init delivery. It includes init handling/catalogue/rows, the normal16ms query debounce, request roundtrip, draw and frame callbacks. Draw time is canvas command submission/DOM work, not GPU completion. Double RAF is an opportunity for rendering, **not proof that pixels were presented**. Host and renderer time origins are never subtracted; host duration separately includes init transport and telemetry return.

Earlier run-FceDu2 passed functional checks with32 samples, request median14.25ms/draw8.75ms/first opportunity45.5–141.9ms. Its phase loop report excluded the probe-observation phases. The harness was corrected to wrap each renderer observation as a measured phase; final run-risLLx includes those phases. Native runs were not matched performance A/B trials; don't claim the lower final numbers as an optimization. Regression after final harness/integration-test changes:28 PASS/0fail/skip, final typecheck and development build exit0.

Final measured warm/open/render/query/close phase host loop maximum52.36ms. Initial setup/cancellation excluded, short phases may lack a sample, no renderer event-loop percentile is measured. Worker parse838.82–1048.65ms remains distinct from these renderer intervals. RSS initial203.94MiB/peak423.38/final403.37; baseline return remains unproven. Earlier900ms cause is still unresolved. No physical pointer/key/Cancel-click latency or whole-workbench memory claim.

## Coverage and next execution

Unit checks: opt-in/no normal telemetry, separated clocks/draw/frame durations, nonce reset/loading, obsolete and superseded frames, pending/sample/row bounds, hidden-page visibility. Bundled actual webview code in VM covers ordinary no-frame/no-telemetry behavior, enum/numeric rendering, diagnostic cursor request routing and revoked probes, with fake timing clearly separate from native evidence. Existing cancellation/identity/limits/worker/value-reuse tests remain green.

Next: use this boundary instrumentation for **32 parent rows plus128 expanded bit rows**, a transition-visible viewport near the fixture's actual timestamp origin, dense viewport/zoom and reload/close recovery. Current eight default signals over a0→large-end viewport do not accept those stress conditions. Add focused UI stress coverage before proposing further parser changes. Physical interaction, representative real user project, actual editing profile, recorded structure boundaries and native RSS recovery remain open; clean Windows deferred for no separatePC/VM. No premature F completion, release, discovery/compiler/independent-IDE stage transition.
