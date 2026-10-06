import { readFile, writeFile, mkdir, cp, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parse } from 'jsonc-parser';

// Read only a bounded editing profile. Never clone account/storage data or launch
// unrelated installed extensions. The installed old RTL build must not compete
// with the development extension being tested.
export async function prepareEditorProfile(runRoot) {
  const user = path.join(process.env.APPDATA, 'Code', 'User');
  const destination = path.join(runRoot, 'profile', 'User');
  await mkdir(destination, { recursive: true });
  const sources = [];
  async function read(name, fallback) {
    try {
      const bytes = await readFile(path.join(user, name));
      const errors = [], value = parse(bytes.toString('utf8'), errors);
      if (errors.length) throw Error(`Invalid JSONC editing profile: ${name}`);
      sources.push({ name, sha256: createHash('sha256').update(bytes).digest('hex') });
      return value;
    } catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
  }
  const settings = await read('settings.json', {});
  const relevant = Object.fromEntries(Object.entries(settings).filter(([key]) =>
    /^(editor\.|rtl\.editor\.|verilog\.|files\.associations$|\[(?:verilog|systemverilog)\]$)/.test(key)));
  const bindings = await read('keybindings.json', []);
  if (!Array.isArray(bindings)) throw Error('Expected a keybindings array');
  const relevantBindings = bindings.filter(binding =>
    /^(?:(?:ctrl|alt|shift|cmd)\+)*(?:tab|enter|f5|escape)$/i.test(binding.key ?? '') ||
    /^(?:-?rtl\.|-?verilog\.)/.test(binding.command ?? ''));
  await writeFile(path.join(destination, 'settings.json'), JSON.stringify(relevant, null, 2));
  await writeFile(path.join(destination, 'keybindings.json'), JSON.stringify(relevantBindings, null, 2));
  const extensionRoot = path.join(process.env.USERPROFILE, '.vscode', 'extensions');
  const installed = await readdir(extensionRoot);
  const candidates = installed.filter(name => /^mshr-h\.veriloghdl-/.test(name));
  if (candidates.length !== 1) throw Error('Expected exactly one installed Verilog HDL extension for this bounded profile test');
  const extension = candidates[0];
  await cp(path.join(extensionRoot, extension), path.join(runRoot, 'extensions', extension), { recursive: true });
  await writeFile(path.join(runRoot, 'editor-profile-input.json'), JSON.stringify({
    source: 'Code/User default editing settings and keybindings', sources,
    settingKeys: Object.keys(relevant), bindingCount: relevantBindings.length,
    copiedExtensions: [extension], excluded: ['account/storage data', 'other extensions', 'user snippets', 'named profiles', 'workspace settings']
  }, null, 2));
}
