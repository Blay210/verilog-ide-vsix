module counter (
    input logic clk,
    input logic rst_n,
    output counter_pkg::count_t count
);
    timeunit 1ns; timeprecision 1ps;
    always_ff @(posedge clk)
        if (!rst_n) count <= '0;
        else count <= count + 1'b1;
endmodule
