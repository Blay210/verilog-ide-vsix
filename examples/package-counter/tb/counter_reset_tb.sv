module counter_reset_tb;
    timeunit 1ns; timeprecision 1ps;
    logic clk = 0, rst_n = 0;
    logic [7:0] count;
    counter dut (.*);
    always #5 clk = ~clk;
    initial begin
`ifdef RTL_WAVEFORM
`ifdef RTL_FST
        $dumpfile("wave.fst");
`else
        $dumpfile("wave.vcd");
`endif
        $dumpvars(0, counter_reset_tb);
`endif
        #11; rst_n = 1;
        #20; rst_n = 0;
        #10;
        assert (count == 0) else $fatal(1, "Reset failed: %0d", count);
        $display("PASS counter_reset");
        $finish;
    end
endmodule
