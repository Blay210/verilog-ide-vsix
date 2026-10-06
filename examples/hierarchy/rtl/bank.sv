module bank #(parameter int WIDTH = 4, LANES = 2, INVERT = 1) (
    input logic [WIDTH*LANES-1:0] a,
    output wire [WIDTH*LANES-1:0] y
);
    timeunit 1ns; timeprecision 1ps;
    for (genvar i = 0; i < LANES; i++) begin : lanes
        if (INVERT) begin : enabled
            lane #(.WIDTH(WIDTH)) u_lane (
                .a(a[i*WIDTH +: WIDTH]),
                .y(y[i*WIDTH +: WIDTH])
            );
        end else begin : bypass
            assign y[i*WIDTH +: WIDTH] = a[i*WIDTH +: WIDTH];
        end
    end
endmodule
