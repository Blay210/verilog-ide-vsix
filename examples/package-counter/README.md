# Package counter

Open this folder in the RTL development host. Approve RTL language support setup if needed. Run both tests or choose RTL: Run Tests by Tag.

The three package files are deliberately listed in reverse dependency order. Slang extracts imports and scoped references; Core orders base_pkg, width_pkg, counter_pkg before the DUT. Two tests run concurrently in separate .rtl/runs directories. RTL: Show Run History restores previous results, logs and waveforms.

CLI: rtl test --tag smoke --jobs 2; rtl history --json. Fail test conditions with assertions and $fatal. No sources are rewritten.
