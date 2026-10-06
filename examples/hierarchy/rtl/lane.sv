module lane #(parameter int WIDTH = 4) (
    input logic [WIDTH-1:0] a,
    output logic [WIDTH-1:0] y
);
    timeunit 1ns; timeprecision 1ps;
    assign y = ~a;
endmodule
