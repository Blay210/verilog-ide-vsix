# F1H: maximum rows, dense viewports and Reload recovery

Historical next-step note: [F1I](waveform-dense-recovery.md) subsequently separated dense costs, added bounded query/coordinate reuse and verified in-flight latest requests plus loading-Reload tab close/peer/reopen. Physical interaction and RSS/user-design acceptance remain open.

2026-10-06. Functional stress acceptance for32 parent/128 expanded bit rows is complete on isolated native synthetic fixtures. A real one-second drawing stall was found and fixed. Dense view responsiveness, physical interaction, representative designs and whole-F acceptance remain open.

## Reproduction and fixture boundary

```powershell
$env:VSCODE_EXECUTABLE='D:/Tools/Microsoft VS Code/Code.exe'
$env:RTL_DEV_HOME=(Resolve-Path '.dev/rtl-dev').Path
$env:RTL_WAVEFORM_RENDER_TEST='stress'
node scripts/test-vscode.mjs
```

Set only this suite flag. The development runner builds output and opens an isolated fixture/profile; no VSIX/install. Existing `.dev/waveform-scale-latest.json` provides4096signals/786432changes over192ticks. A second fixture has32signals/4096ticks/131072changes so normal viewport widths trigger actual bounded dense buckets. Both VCDs live in fixture `.rtl/`, with timestamp origin9007199254740993; user examples are untouched.

`waveform-render-stress.ts` drives actual webview requests via the explicitly enabled Development/Test diagnostic command. Production never registers it. Bounded probe options select32parents/16eight-bit buses, use existing expansion/rebuild/range/cursor code and request Reload through the normal host handler. Shared validators reject invalid ranges/counts/details. Telemetry captures actual parent DOM row counts,128 DOM bit labels/offsets and dense-row counts; metadata and diagnostic limits remain unchanged. This is programmatic UI-path verification, not physical pointer input.

The test checks all32 raw parent values and128 bit labels against generated expectations at exact large ticks (including X/Z), dense32→zoom0 transition, two Reloads, nonce change, restored cursor/range/parent/bit values, peer reactivation, close-one/keep-peer and all4 actual worker exits. Ready-state close is covered; cancellation while Reload/drawing is still in flight is a separate next stress case. Source SHA is unchanged. Rows include those below the scroll viewport, so this is not proof that all160 pixels are visible/presented.

## Found problem and correction

Initial run `.dev/vscode-tests/run-72LMDz/project/.rtl/extension-test.json` passed functional assertions but drawing took1003.5–1235.5ms at160rows, even after zooming to16/32ticks. That was not performance acceptance.

Drawing previously alternated label/backing-store writes with canvas clientWidth/clientHeight reads and repeated theme/ruler computation per canvas. It now reads all canvas sizes and theme colors before writing, and shares ruler computations among equal-width canvases **only within the current draw**. Fonts/time range/theme/resize are freshly evaluated each draw; no persistent visual cache or dropped rows. The bundled webview regression asserts all layout-size reads precede first drawing write, while retaining enum/numeric/bit results. Normal UI benefits from the fix; profiler remains opt-in.

First corrected run-w34mNG: draw36.8–157.3ms, functional pass/hostexit0. Final run below additionally strengthens Reload equality and measures actual DOM parent count. Native conditions vary, so timings are local before/after observations, not a guaranteed speed ratio or proof resolving the historical900ms host delay.

## Final native results

Receipt `.dev/vscode-tests/run-a7v4rO/project/.rtl/extension-test.json`, VS Code1.140.0/hostNode24.21.0 Windows. passed/rendererStress/sourceHashPreserved=true,4created/4exited workers, hostexit0. All eight recorded cases have32actual parent rows and128bit rows.

| Case | Dense parents | Window RTT ms | Canvas draw ms |
|---|---:|---:|---:|
| Medium full activity interval | 0 | 36.5 | 117.5 |
| Medium zoom16ticks | 0 | 5.2 | 51.1 |
| Medium Reload | 0 | 9.6 | 45.9 |
| Dense4095tick interval | 32 | 200.2 | 188.0 |
| Dense zoom32ticks | 0 | 9.6 | 54.5 |
| Dense Reload | 0 | 8.5 | 58.7 |
| Medium peer retained | 0 | 5.0 | 50.1 |
| Dense peer after medium close | 0 | 5.4 | 48.6 |

Phase host event-loop maximum46.14ms. That measures the extension host, not renderer blocking. Dense query200ms + draw188ms still needs improvement; don't describe this as smooth60fps or fully accepted UI latency. RTT includes actual webview/host/worker scheduling and serialization, not pure IPC. Draw interval excludes subsequent diagnostic DOM inspection/compositor work; doubleRAF remains only a frame opportunity. Measurements have no repeated statistical confidence bounds here.

RSS initial226.54MiB/peak350.04/final329.60; no forcedGC, baseline recovery still unproven, and these two different-size readers cannot be compared directly with older two-medium-reader RSS. Final related29 PASS/0fail/skip, typecheck exit0 and development build/native runner exit0. Tests include probe/detail validation, disabled diagnostics, obsolete frames, bounded telemetry, layout read ordering, identity/cancellation/enum/value reuse and worker disposal.

## Next execution and remaining gates

Next isolate **dense-window worker query versus renderer preparation/bit projection/plot cost**, then compare bounded optimizations using the same dense fixture and full parent/bit expectations. Preserve dense parent activity as an approximation: bit children must never invent exact bit edges from parent bucket counts. Add rapid superseding requests and close/cancel during Reload stress, and validate scrolling/zoom/drag physically. No automatic compiler/cache rewrite.

Large remaining gates: actual user design (hundreds of RTL files/thousands of signals), actual editing profile conflicts, retained-structure boundaries, native RSS recovery; clean Windows deferred because the user has no separatePC/VM. U12 discovery, independent IDE/compiler, internal FST and later diagram/operator features remain their existing stages. No packaging/install/user-source edits.
