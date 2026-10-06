import { scanCode } from './lexical';

export interface LanguageCompletion { label: string; kind: 'keyword' | 'function' | 'primitive'; detail: string }
const keywords = 'always assign begin case casex casez default defparam disable else end endcase endfunction endgenerate endmodule endtask event for force forever fork function generate genvar if initial inout input integer join localparam module negedge output parameter posedge real realtime reg release repeat signed task time wait while wire'.split(' ');
const systemVerilog = 'always_comb always_ff always_latch assert automatic bit break byte class const continue cover do enum final foreach import inside int interface join_any join_none logic longint package packed priority program property return shortint shortreal static string struct task typedef union unique unsigned var virtual void endclass endinterface endpackage endprogram endproperty'.split(' ');
const primitives = 'and nand nor not or xor xnor buf bufif0 bufif1 notif0 notif1'.split(' ');
const functions: [string, string][] = [
  ['$display', 'Print values followed by a newline.'], ['$write', 'Print values without a newline.'],
  ['$monitor', 'Print when an argument changes.'], ['$strobe', 'Print values at the end of the current time step.'],
  ['$finish', 'End simulation.'], ['$stop', 'Suspend simulation (backend behavior varies).'],
  ['$time', 'Current simulation time as an integer.'], ['$realtime', 'Current simulation time as a real value.'],
  ['$dumpfile', 'Select the waveform output file.'], ['$dumpvars', 'Select signals to record in the waveform.'],
  ['$readmemh', 'Load memory values from a hexadecimal file.'], ['$readmemb', 'Load memory values from a binary file.'],
  ['$random', 'Generate a signed pseudorandom value.'], ['$signed', 'Interpret a value as signed.'], ['$unsigned', 'Interpret a value as unsigned.'],
  ['$clog2', 'Ceiling of the base-2 logarithm.']
];
const svFunctions: [string, string][] = [
  ['$fatal', 'Report a fatal error and terminate simulation.'], ['$error', 'Report an error.'], ['$warning', 'Report a warning.'], ['$info', 'Report information.'],
  ['$bits', 'Number of bits in an expression or type.'], ['$size', 'Size of an array dimension.'],
  ['$urandom', 'Generate an unsigned pseudorandom value.'], ['$urandom_range', 'Generate a random value in a range.'],
  ['$isunknown', 'Test for X or Z bits.'], ['$onehot', 'Test whether exactly one bit is set.'], ['$countones', 'Count set bits.']
];

export function basicCompletions(text: string, offset: number, language: 'verilog' | 'systemverilog'): { start: number; items: LanguageCompletion[] } {
  const prefix = text.slice(0, offset);
  if (scanCode(prefix).context !== 'code') return { start: offset, items: [] };
  const word = /\$?[A-Za-z_][\w$]*$|\$$/.exec(prefix)?.[0] ?? '';
  const start = offset - word.length;
  // These locations need semantic/member completion, not global keywords.
  if (/(?:\.|::)\s*$/.test(prefix.slice(0, start))) return { start, items: [] };
  const items: LanguageCompletion[] = [];
  if (!word.startsWith('$')) {
    for (const label of new Set([...keywords, ...(language === 'systemverilog' ? systemVerilog : [])])) items.push({ label, kind: 'keyword', detail: `${language === 'systemverilog' ? 'SystemVerilog' : 'Verilog'} keyword` });
    for (const label of primitives) items.push({ label, kind: 'primitive', detail: 'Built-in gate primitive' });
  }
  for (const [label, detail] of [...functions, ...(language === 'systemverilog' ? svFunctions : [])]) items.push({ label, kind: 'function', detail });
  return { start, items };
}
