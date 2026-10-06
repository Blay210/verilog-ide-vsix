import path from 'node:path';
import { mkdir, open, readFile, access, appendFile } from 'node:fs/promises';

export const exampleFiles: Record<string, string> = {
  'rtl.toml': `version = 1
[project]
name = "counter"
[sources]
rtl = ["rtl/**/*.sv"]
[simulation]
backend = "verilator"
timing = true
waveform = "vcd"
timeout_ms = 60000
[[test]]
name = "counter_basic"
tags = ["smoke", "basic"]
top = "counter_basic_tb"
sources = ["tb/counter_basic_tb.sv"]
[[test]]
name = "counter_reset"
tags = ["smoke", "reset"]
top = "counter_reset_tb"
sources = ["tb/counter_reset_tb.sv"]
`,
  'rtl/counter.sv': `module counter (
    input logic clk,
    input logic rst_n,
    output logic [7:0] count
);
    timeunit 1ns; timeprecision 1ps;
    always_ff @(posedge clk)
        if (!rst_n) count <= '0;
        else count <= count + 1'b1;
endmodule
`,
  'tb/counter_basic_tb.sv': `module counter_basic_tb;
    timeunit 1ns; timeprecision 1ps;
    logic clk = 0, rst_n = 0;
    logic [7:0] count;
    counter dut (.*);
    always #5 clk = ~clk;
    initial begin
\`ifdef RTL_WAVEFORM
\`ifdef RTL_FST
        $dumpfile("wave.fst");
\`else
        $dumpfile("wave.vcd");
\`endif
        $dumpvars(0, counter_basic_tb);
\`endif
        #11; rst_n = 1;
        #30;
        assert (count == 3) else $fatal(1, "Expected 3, got %0d", count);
        $display("PASS counter_basic");
        $finish;
    end
endmodule
`,
  'tb/counter_reset_tb.sv': `module counter_reset_tb;
    timeunit 1ns; timeprecision 1ps;
    logic clk = 0, rst_n = 0;
    logic [7:0] count;
    counter dut (.*);
    always #5 clk = ~clk;
    initial begin
\`ifdef RTL_WAVEFORM
\`ifdef RTL_FST
        $dumpfile("wave.fst");
\`else
        $dumpfile("wave.vcd");
\`endif
        $dumpvars(0, counter_reset_tb);
\`endif
        #11; rst_n = 1;
        #20; rst_n = 0;
        #10;
        assert (count == 0) else $fatal(1, "Reset failed: %0d", count);
        $display("PASS counter_reset");
        $finish;
    end
endmodule
`,
  'README.md': '# Counter example\n\nOpen this folder in VS Code with RTL Dev installed. Use the Testing view to run either or both tests. Approve tool installation if prompted. Open the RTL Results view for logs and waveforms.\n\n`rtl test --all` runs the same tests from the CLI. Fail tests using assertions with `$fatal`. `simulation.waveform` selects `vcd`, `fst`, or `none`. Dump files should use relative paths so they stay in `.rtl/`.\n'
};

export async function createProject(root: string, example: boolean): Promise<void> {
  const files = example ? exampleFiles : {
    'rtl.toml': 'version = 1\n[project]\nname = "rtl-project"\n[sources]\nrtl = []\n# Set rtl = ["rtl/**/*.sv"] after adding sources.\n[simulation]\nbackend = "verilator"\ntiming = true\nwaveform = "vcd"\n# Add [[test]] with name, top and sources to register a testbench.\n'
  };
  // Preflight all destinations; never overwrite an existing source or manifest.
  for (const name of Object.keys(files)) {
    try { await access(path.join(root, name)); } catch { continue; }
    throw Error(`File already exists: ${name}. Choose an empty folder or create a minimal manifest.`);
  }
  for (const [name, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, name)), { recursive: true });
    const file = await open(path.join(root, name), 'wx');
    try { await file.writeFile(content); } finally { await file.close(); }
  }
  const ignore = path.join(root, '.gitignore');
  let existing = '';
  try { existing = await readFile(ignore, 'utf8'); } catch { /* New repository. */ }
  if (!existing.split(/\r?\n/).some(line => ['.rtl/', '/.rtl/', '.rtl'].includes(line.trim()))) await appendFile(ignore, `${existing && !existing.endsWith('\n') ? '\n' : ''}.rtl/\n`);
}
