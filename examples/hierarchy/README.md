# Elaborated design exploration

Open this folder in the development host and run **RTL: Explore Design Structure**. Select `narrow` (two 4-bit lanes) or `wide` (three 8-bit lanes). Expand RTL Hierarchy in Explorer and select an instance to inspect its port bindings and parameters. Click source links or use Open Instance Source / Open Module Definition in the tree context menu.

The loop and conditional generate blocks reflect elaboration. Change INVERT to 0 in an unsaved RTL buffer, then Refresh Design Structure to see the bypass branch. Unsaved RTL is analyzed without writing sources; save rtl.toml before changing project configuration. Changed snapshots are marked stale until refreshed.

The diagram describes instance port bindings, not a synthesized gate netlist. Interface/modport wiring is explicitly shown as unsupported. No Verilator run is needed for structure exploration. Both registered tests also support simulation and VCD/FST dumps.

CLI: `rtl hierarchy narrow --json` or `rtl hierarchy wide`. These use saved files and the same semantic provider as the IDE. `rtl test --all` runs both simulation checks.
