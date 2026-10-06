module narrow_tb;
    timeunit 1ns; timeprecision 1ps;
    logic [7:0] a = '0;
    wire [7:0] y;
    bank #(.WIDTH(4), .LANES(2)) dut (.*);
    initial begin
`ifdef RTL_WAVEFORM
`ifdef RTL_FST
        $dumpfile("wave.fst");
`else
        $dumpfile("wave.vcd");
`endif
        $dumpvars(0, narrow_tb);
`endif
        #1;
        assert (y === ~a) else $fatal(1, "Lane inversion failed");
        a = '1;
        #1;
        assert (y === ~a) else $fatal(1, "Lane inversion failed");
        $finish;
    end
endmodule
