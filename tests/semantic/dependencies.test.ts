import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, mkdtemp, writeFile, readdir, readFile } from 'node:fs/promises';
import { loadProject, prepareProject } from '@rtl-dev/core';
import { SlangProvider } from '@rtl-dev/semantic';

test('native package ordering follows preprocessed imports, scoped names and included headers', { skip: !process.env.RTL_SEMANTIC_PYTHON }, async () => {
  const base = path.resolve('.dev/semantic'); await mkdir(base, { recursive: true });
  const root = await mkdtemp(path.join(base, 'packages-')); const projectRoot = path.join(root, '한글 project'); await mkdir(projectRoot);
  const files: Record<string, string> = {
    'rtl.toml': 'version=1\n[project]\nname="packages"\n[sources]\npackages=["a.sv","b.sv","c.sv"]\nrtl=["top.sv"]\ninclude_dirs=["."]\ndefines={FEATURE=1}\n',
    'a.sv': 'package a; `include "imports.svh"\n localparam int N = b::N + 1; endpackage\n',
    'imports.svh': '`ifdef FEATURE\n`ifdef RTL_WAVEFORM\n import b::*;\n`else\n import absent_wave::*;\n`endif\n`else\n import absent::*;\n`endif\n',
    'b.sv': 'package b; localparam int N = c::N + 1; endpackage\n',
    'c.sv': 'package c; localparam int N = 2; endpackage\n',
    'top.sv': 'module top; int n = a::N; initial $finish; endmodule\n'
  };
  for (const [name, text] of Object.entries(files)) await writeFile(path.join(projectRoot, name), text);
  const provider = new SlangProvider(process.env.RTL_SEMANTIC_PYTHON!, path.resolve('packages/semantic/python/analyze.py'), path.join(root, 'cache'));
  const project = await loadProject(projectRoot);
  const prepared = await prepareProject(project, provider);
  assert.deepEqual(prepared.sources.map(f => path.basename(f)), ['c.sv', 'b.sv', 'a.sv', 'top.sv']);
  assert.equal((await provider.analyze(project, [])).diagnostics.filter(d => d.severity === 'error').length, 0);
  await assert.rejects(provider.analyze(project, [{ file: path.join(projectRoot, 'c.sv'), text: 'package c; import a::*; localparam int N=2; endpackage' }]), /cycle/);
  assert.equal(await readFile(path.join(projectRoot, 'c.sv'), 'utf8'), files['c.sv']);
  assert.deepEqual(await readdir(path.join(root, 'cache')), []);
});
