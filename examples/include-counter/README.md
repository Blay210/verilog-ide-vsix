# Include counter

Two SystemVerilog tests share a package-based counter. `sources.include_dirs` searches
`include/primary` before `include/secondary`. The first config.svh includes
nested/width.svh and sets the counter width to 8. The lower-priority config sets
16, so the simulation and hierarchy checks detect wrong search order.

Open this folder in the development IDE and run the tests from RTL Start.
Successful runs retain both configured trees and their order under `.rtl/`;
Explore Recorded Structure reuses those headers even after the originals change.
Keep includes as standalone quoted relative paths resolved by configured roots.
Source-local conflicting shadows, relative-only/dynamic/external includes are
currently unsupported for source preservation (normal simulation still runs).

Tests fail with assertions / `$fatal`. VCD is the default; FST and disabled dumps
use the same RTL_WAVEFORM / RTL_FST guards as the other examples.
