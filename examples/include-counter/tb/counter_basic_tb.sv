module counter_basic_tb;
    timeunit 1ns; timeprecision 1ps;
    logic clk = 0, rst_n = 0;
    logic [7:0] count;
    counter dut (.*);
    always #5 clk = ~clk;
    initial begin
        assert ($bits(dut.count) == 8) else $fatal(1, "Include search chose the wrong width");
`ifdef RTL_WAVEFORM
`ifdef RTL_FST
        $dumpfile("wave.fst");
`else
        $dumpfile("wave.vcd");
`endif
        $dumpvars(0, counter_basic_tb);
`endif
        #11; rst_n = 1;
        #30;
        assert (count == 3) else $fatal(1, "Expected 3, got %0d", count);
        $display("PASS counter_basic");
        $finish;
    end
endmodule
