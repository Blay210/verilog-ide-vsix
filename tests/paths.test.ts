import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, mkdtemp, writeFile, readFile, readdir } from 'node:fs/promises';
import { buildPaths } from '../packages/verilator/src/paths';

test('Windows path aliases preserve source files and clean up only junctions', { skip: process.platform !== 'win32' }, async () => {
  const base = path.resolve('.dev/tests'); await mkdir(base, { recursive: true });
  const root = await mkdtemp(path.join(base, 'alias-'));
  const project = path.join(root, '한글 project'); await mkdir(project);
  const source = path.join(project, 'test.sv'); await writeFile(source, 'module test; endmodule');
  const cache = path.join(root, 'cache');
  const paths = await buildPaths(project, cache);
  try {
    const mapped = await paths.map(source);
    assert.match(mapped, /^[\x21-\x7e]+$/);
    assert.equal(await readFile(mapped, 'utf8'), 'module test; endmodule');
    assert.equal(paths.original(mapped), source.replaceAll('\\', '/'));
  } finally { await paths.dispose(); }
  assert.deepEqual(await readdir(cache), []);
  assert.equal(await readFile(source, 'utf8'), 'module test; endmodule');
});
