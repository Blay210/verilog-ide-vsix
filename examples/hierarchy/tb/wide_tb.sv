module wide_tb;
    timeunit 1ns; timeprecision 1ps;
    logic [23:0] a = '0;
    wire [23:0] y;
    bank #(.WIDTH(8), .LANES(3)) dut (.*);
    initial begin
`ifdef RTL_WAVEFORM
`ifdef RTL_FST
        $dumpfile("wave.fst");
`else
        $dumpfile("wave.vcd");
`endif
        $dumpvars(0, wide_tb);
`endif
        #1;
        assert (y === ~a) else $fatal(1, "Lane inversion failed");
        a = '1;
        #1;
        assert (y === ~a) else $fatal(1, "Lane inversion failed");
        $finish;
    end
endmodule
