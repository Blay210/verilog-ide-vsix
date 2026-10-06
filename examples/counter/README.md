# Counter example

Open this folder in VS Code with RTL Dev installed. Use the Testing view to run either or both tests. Approve tool installation if prompted. Open the RTL Results view for logs and waveforms.

`rtl test --all` runs the same tests from the CLI. Fail tests using assertions with `$fatal`. `simulation.waveform` selects `vcd`, `fst`, or `none`. Dump files should use relative paths so they stay in `.rtl/`.
