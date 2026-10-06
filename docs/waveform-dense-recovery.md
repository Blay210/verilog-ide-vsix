# F1I: dense cost split, bounded reuse and in-flight recovery

2026-10-06. Query/renderer cost separation, bounded reuse and rapid-request/Reload-close recovery are implemented and verified. F stability, physical input, pixel presentation, representative user designs and RSS baseline return remain open. No VSIX/install/user examples changed.

## Cost boundary and implementation

Worker `profile=true` now records `queryMs` for window queries in the separate diagnostic envelope. Ordinary results/metadata and normal requests are unchanged. The isolated stress Worker wrapper observes request→response separately from the full renderer→host→worker→renderer roundtrip. Neither is pure IPC.

Renderer samples now separate preparation, parent plots (including the ruler), bit projection and bit plots. They are enabled only inside an explicitly profiled response draw, accumulate across rows and clear on exceptions. The host copies only finite bounded known phase values; timing stays out of saved views. Phase sums exclude some label/DOM work and are statistical clock observations, not CPU profiles or compositor timings.

Two production changes preserve contracts:

- Dense query buckets share boundaries only within the query, keyed by bounded cell count. Each bucket reuses the preceding right upper-bound index as its left index; the current right index yields both final value and edge count. This replaces three binary searches per bucket with one. The selected32/pixels1600 limits bound temporary tables; no cross-query cache.
- Renderer plots share normalized timestamp positions within a draw, capped at4096 unique times. Width multiplication remains canvas-specific and existing BigInt subtraction/division/truncation is preserved. The cache is recreated on every draw, including resize/range/theme changes; no persistent stale coordinates. Parent activity buckets and projected bit approximation are unchanged.

The dense-query test compares complete buckets to an independent linear oracle over large timestamps, repeated boundary ticks, aliases, X/Z, short spans and1/16/1600pixels. Naturally sparse cases compare their exact transition slice. Initial test failure was an incorrect assumption that every generated case would be dense; the sparse branch is now verified explicitly.

## Reproduction and native recovery

Use the existing isolated native command with `RTL_WAVEFORM_RENDER_TEST='stress'` (no other suite flags), `VSCODE_EXECUTABLE=D:/Tools/Microsoft VS Code/Code.exe`, `RTL_DEV_HOME=.dev/rtl-dev`, then `node scripts/test-vscode.mjs`. Fixtures remain medium4096×192 and dense32×4096 under generated project `.rtl/`; all cases use32parents/128DOM bit labels when configured.

Stress additions:

- Observe an actual pending worker window request, then submit20 real-webview cursor requests; verify the final cursor119 and every parent/bit value. Obsolete window replies cannot replace it.
- After steady close, reopen two readers; trigger medium Reload, observe its new worker loading, close that tab, await actual exit/document removal, preserve the peer, reopen the cancelled trace and verify exact values. Eight total workers must exit and original fixture SHAs stay equal.

Initial optimized run-Vxxd0c failed the **test observation**: polling missed the short pending-request interval, then timed out (receipt passed=false,4worker cleanup). It did not establish a product hang. Replaced polling with a one-shot Worker postMessage-start event armed before triggering the window request. It asserts pendingWindows>0 before dispatching the burst; no artificial delay is added to the product.

Final receipt `.dev/vscode-tests/run-Qv9vJv/project/.rtl/extension-test.json`: passed/rendererStress/sourceHashPreserved/burstSawInFlight/reloadClosedWhileLoading/cancelReopenRecovered=true;8created/8exited workers, hostexit0. Cancel is **loading-tab close**, not a physical progress Cancel-button click. Full32parent/128bit expectations, dense→zoom, Reload cursor/range/values equality, peer recovery and final empty document state passed.

## Local observations, not portable performance acceptance

Baseline cost-split run-WXS2Bk: dense window roundtrip168.2ms, draw173.1ms; worker query73.85ms/worker roundtrip91.83ms. Renderer preparation1.2ms, parent plots30.7ms, bit projection12.2ms, bit plots119.8ms.

Final run-Qv9vJv: first dense window full roundtrip111.4ms, draw127.1ms; worker query20.61ms/worker roundtrip38.47ms. Renderer preparation1.1ms, parent plots24.9ms, bit projection12.8ms, bit plots80.3ms. Later in-flight/burst dense queries35.28/34.52ms and worker roundtrips53.73/53.63ms; final burst renderer roundtrip132.2ms/draw131.1ms. Ordinary zoom/reload/peer cases roundtrip5.7–9.0ms and draw42.3–66.6ms.

The algorithm removes redundant searches/coordinate conversions and local measurements are lower, but separate native runs are not controlled statistical A/B trials. Don't promise a speed ratio or call~239ms dense request+draw smooth60fps. Transport/scheduling/serialization and bit plotting remain material; this does not prove the cause of the historical900ms host delay.

Final phase host-loop maximum54.95ms; renderer blocking is measured separately. RSS initial224.13MiB/peak371.68/final352.42, no forcedGC and no baseline-return proof. Additional cancellation/reopen readers make this memory scope differ from earlier4worker runs. DoubleRAF is still a frame opportunity, not displayed-pixel evidence; screenshots/physical scroll/drag remain separate.

Final related31 PASS/0fail/skip, typecheck exit0, development build/native runner exit0. Existing tests plus new draw-phase/exception checks, ordinary/profiled window result equality, finite query timings and independent dense oracle passed. No simulation/backend semantics changed.

## Next execution

Continue F with actual scrolling/zoom/drag at160rows and quick interactions, then investigate **visible-row rendering and transport/serialization** only if measured responsiveness warrants it. Preserve offscreen bit values, redraw on scroll/reveal, exact cursor/latest-request and Reload/cancel recovery; don't merely stop drawing offscreen rows without a recovery path. Current160-row synthetic correctness does not accept representative hundreds-of-RTL-file designs or actual user editing-profile conflicts. Recorded-structure gates, RSS recovery and clean Windows (no separatePC/VM) remain tracked. No premature compiler rewrite, release or independent-IDE stage transition.
