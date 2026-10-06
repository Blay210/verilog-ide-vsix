import { parseVcd, mapTracePorts } from '@rtl-dev/waveform';
import path from 'node:path';
import { loadProject, runTests, createProject, prepareProject, selectTests, readHistory, compareResultInputs, loadRecordedInputs, loadRecordedTrace } from '@rtl-dev/core';
import { SlangProvider } from '@rtl-dev/semantic';
import { VerilatorBackend } from '@rtl-dev/verilator';
import { detectTools, verifyToolchain, WindowsMsys2Provider, detectSemanticRuntime, installSemanticRuntime, semanticRoot, toolsHome } from '@rtl-dev/toolchain';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const index = args.indexOf('--project');
  let directory = process.cwd();
  if (index >= 0) { if (!args[index + 1]) throw Error('--project requires a directory'); directory = path.resolve(args[index + 1]); args.splice(index, 2); }
  const controller = new AbortController();
  process.once('SIGINT', () => controller.abort());
  const context = { signal: controller.signal, onLog: (text: string) => process.stdout.write(text) };
  if (args[0] === 'history') {
    let limit = 100, json = false, verify = false;
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--json') json = true;
      else if (args[i] === '--verify-inputs') verify = true;
      else if (args[i] === '--limit' && args[i + 1]) limit = Number(args[++i]);
      else throw Error('Usage: rtl history [--limit 1..1000] [--json] [--verify-inputs]');
    }
    const history = await readHistory(directory, limit);
    if (verify) {
      const project = await loadProject(directory);
      const runtime = project.packageOrder === 'auto' && project.packageSources?.length ? await detectSemanticRuntime() : undefined;
      const provider = runtime ? new SlangProvider(runtime, path.join(__dirname, 'analyze.py'), path.join(toolsHome(), 'cache', 'semantic')) : undefined;
      const prepared = await prepareProject(project, provider, context);
      const checked = [];
      for (const result of history) checked.push({ ...result, inputComparison: await compareResultInputs(result, prepared, controller.signal) });
      console.log(json ? JSON.stringify(checked, null, 2) : checked.map(r => `${r.name} ${r.runId ?? 'legacy'}: ${r.inputComparison.state} - ${r.inputComparison.message}`).join('\n') || 'No run history.');
      return;
    }
    console.log(json ? JSON.stringify(history, null, 2) : history.map(r => `${r.startedAt} ${r.status.toUpperCase()} ${r.name} [${r.tags?.join(', ') ?? ''}]\n  ${r.log}`).join('\n') || 'No run history.');
    return;
  }
  if (args[0] === 'trace') {
    let runId:string|undefined,json=false;
    for(let i=1;i<args.length;i++) {
      if(args[i]==='--run' && !runId && args[i+1])runId=args[++i];
      else if(args[i]==='--json' && !json)json=true;
      else throw Error('Usage: rtl trace --run RUN_ID [--json] [--project folder]');
    }
    if(!runId)throw Error('Select a recorded run with --run RUN_ID.');
    const result=(await readHistory(directory,1000)).find(row=>row.runId===runId);
    if(!result)throw Error('Recorded run not found in the latest 1000 results.');
    const saved=await loadRecordedInputs(result,controller.signal),trace=await loadRecordedTrace(result,controller.signal);
    const data=parseVcd(trace.bytes.toString('utf8')),python=await detectSemanticRuntime();
    if(!python)throw Error('Set up RTL language support before recorded trace mapping.');
    const provider=new SlangProvider(python,path.join(__dirname,'analyze.py'),path.join(toolsHome(),'cache','semantic'));
    const design=await provider.hierarchy(saved.project,saved.target.name,[],controller.signal);
    if(design.diagnostics.some(item=>item.severity==='error'))throw Error('Recorded hierarchy contains errors. See rtl hierarchy --run.');
    await loadRecordedInputs(result,controller.signal); // analysis must not race archive damage
    const bindings=mapTracePorts(design,data.signals,result.top);
    const mapped={runId:trace.runId,inputFingerprint:trace.inputFingerprint,traceSha256:trace.sha256,timescale:data.timescale,end:data.end,warnings:data.warnings,bindings};
    console.log(json?JSON.stringify(mapped,null,2):bindings.map(binding=>`${binding.instanceId}.${binding.port}: ${binding.state}${binding.reason?' - '+binding.reason:''}`).join('\n'));
    return;
  }
  if (args[0] === 'hierarchy') {
    let name: string | undefined, json = false, runId: string | undefined;
    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--json' && !json) json = true;
      else if (arg === '--run' && !runId && args[i + 1]) runId = args[++i];
      else if (!arg.startsWith('-') && !name) name = arg;
      else throw Error('Usage: rtl hierarchy [test-name | --run RUN_ID] [--json] [--project folder]');
    }
    if (runId && name) throw Error('Select either a current test name or a recorded run.');
    let project;
    if (runId) {
      const saved = (await readHistory(directory, 1000)).find(result => result.runId === runId);
      if (!saved) throw Error('Recorded run not found in the latest 1000 results.');
      const recorded = await loadRecordedInputs(saved, controller.signal);
      project = recorded.project; name = recorded.target.name;
    } else project = await loadProject(directory);
    const python = await detectSemanticRuntime();
    if (!python) throw Error('Set up RTL language support or run rtl tools language --yes.');
    const provider = new SlangProvider(python, path.join(__dirname, 'analyze.py'), path.join(toolsHome(), 'cache', 'semantic'));
    let result;
    try { result = await provider.hierarchy(project, name, [], controller.signal); }
    catch (error) { if (controller.signal.aborted) { process.exitCode = 130; return; } throw error; }
    if (json) console.log(JSON.stringify(runId ? { ...result, recordedRunId: runId } : result, null, 2));
    else {
      const print = (nodes: typeof result.roots, depth = 0) => { for (const node of nodes) { console.log(`${'  '.repeat(depth)}${node.name}${node.module ? ' : ' + node.module : ''}${node.parameters.length ? ' [' + node.parameters.map(p => `${p.name}=${p.value}`).join(', ') + ']' : ''}`); print(node.children, depth + 1); } };
      print(result.roots);
      for (const diagnostic of result.diagnostics) console.error(`${diagnostic.severity}: ${diagnostic.message}`);
    }
    if (result.diagnostics.some(d => d.severity === 'error')) process.exitCode = 1;
    return;
  }
  if (args[0] === 'tools' && args[1] === 'language' && args.length <= 3) {
    if (args[2] && args[2] !== '--yes') throw Error('Unknown installation option');
    console.log(`slang 11.0.0 / Python 3.14.7\nLocation: ${semanticRoot()}`);
    if (args[2] !== '--yes') { console.log('Run with --yes to approve installation.'); return; }
    await installSemanticRuntime(context); return;
  }
  if (args[0] === 'init' && (args.length === 1 || args[1] === '--example' && args.length === 2)) { await createProject(directory, args.includes('--example')); console.log(`Created ${directory}`); return; }
  if (args[0] === 'tools' && args[1] === 'install' && args.length <= 3) {
    if (args[2] && args[2] !== '--yes') throw Error('Unknown install option');
    const provider = new WindowsMsys2Provider();
    const plan = await provider.plan();
    console.log(JSON.stringify(plan, null, 2));
    if (!args.includes('--yes')) { console.log('No changes made. Run with --yes to approve this installation.'); return; }
    await provider.install(plan, context); console.log('Toolchain verified.'); return;
  }
  if (args[0] !== 'check' && args[0] !== 'test') {
    console.log('RTL Dev\n  rtl trace --run RUN_ID [--json] [--project folder]\n  rtl hierarchy [test-name | --run RUN_ID] [--json] [--project folder]\n  rtl check [--project folder]\n  rtl test <name> | --all | --tag TAG [--tag TAG] [--jobs 1..4] [--project folder]\n  rtl history [--limit N] [--json] [--project folder]\n  rtl init [--example]\n  rtl tools install [--yes]\n  rtl tools language [--yes]');
    if (args.length) process.exitCode = 2;
    return;
  }
  const project = await loadProject(directory);
  let name: string | undefined, jobs: number | undefined;
  const tags: string[] = [];
  let all = false;
  if (args[0] === 'test') {
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--all' && !all) all = true;
      else if (args[i] === '--tag' && args[i + 1] && !args[i + 1].startsWith('--')) tags.push(args[++i]);
      else if (args[i] === '--jobs' && args[i + 1] && jobs === undefined) jobs = Number(args[++i]);
      else if (!args[i].startsWith('--') && !name) name = args[i];
      else throw Error(`Unknown test option: ${args[i]}`);
    }
    if (name && all || !name && !all && !tags.length) throw Error('Select a test name, --all, or --tag TAG.');
    if (jobs !== undefined && (!Number.isInteger(jobs) || jobs < 1 || jobs > 4)) throw Error('--jobs must be 1..4.');
  } else if (args.length !== 1) throw Error('Usage: rtl check [--project folder]');
  const targets = args[0] === 'test' ? selectTests(project, { name, tags }) : [];
  let packageProvider: SlangProvider | undefined;
  if (project.packageOrder === 'auto' && project.packageSources?.length) {
    const python = await detectSemanticRuntime();
    if (!python) throw Error('Package ordering needs slang. Run RTL: Set Up Language Support or rtl tools language --yes.');
    packageProvider = new SlangProvider(python, path.join(__dirname, 'analyze.py'), path.join(toolsHome(), 'cache', 'semantic'));
  }
  if (project.backend !== 'verilator') throw Error(`Unsupported simulator: ${project.backend}`);
  const detected = await detectTools();
  if (!detected.toolchain) throw Error(`Missing: ${detected.missing.join(', ')}. Open RTL: Toolchain in VS Code or use rtl tools install.`);
  if (args[0] === 'check') {
    const prepared = await prepareProject(project, packageProvider, context);
    await verifyToolchain(detected.toolchain, context);
    console.log(`${project.name}: ${project.tests.length} tests; compiler build/run verified.`);
    console.log(`Source order:\n${prepared.sources.join('\n')}`);
    if (!detected.viewer) console.log('GTKWave is missing; simulation works. Open VCD in the RTL IDE built-in viewer; FST needs an external viewer such as GTKWave.');
    return;
  }
  const results = await runTests(project, targets, new VerilatorBackend(detected.toolchain), {
    signal: controller.signal, packageProvider, jobs, onTestLog: (target, text) => process.stdout.write(`[${target.name}] ${text}`), onResult: result => console.log(`\n${result.status.toUpperCase()} ${result.name} (${result.durationMs} ms)\nLog: ${result.log}\n${result.waveform ? `Waveform: ${result.waveform}` : result.message ?? ''}`)
  });
  if (controller.signal.aborted) process.exitCode = 130;
  else if (results.some(r => r.status !== 'passed')) process.exitCode = 1;
}
main().catch(error => { console.error(String(error)); process.exitCode = 1; });
