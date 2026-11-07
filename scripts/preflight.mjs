import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {execFileSync} from 'node:child_process';
import {compileDocument} from './data-model.mjs';
import {createTheme} from './theme.mjs';

const result=(status,details)=>({status,details});
const skipped=reason=>result('not_run',reason);
const message=error=>error instanceof Error?error.message:String(error);
async function portableDependencies(){
 const [{validateDocument},{resolveStyle}]=await Promise.all([import('./template-contract.mjs'),import('./style-profiles.mjs')]);
 return {validateDocument,resolveStyle};
}

/** Full checks probe actual configured executables/modules; merely naming a tool is not availability. */
export async function probeFullRuntime({env,fonts}){
 const checks={runtimePaths:skipped('Runtime configuration not checked.'),runtimeModules:skipped('Runtime paths unavailable.'),python:skipped('Python not checked.'),fonts:skipped('Runtime font inventory unavailable.')};
 const versions={node:process.version};
 const skillDir=env.DECK_PRESENTATIONS_SKILL_DIR,modules=env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||env.RUNTIME_NODE_MODULES,python=env.DECK_RUNTIME_PYTHON;
 let pathsReady=false;
 try{
  for(const [name,value] of [['DECK_PRESENTATIONS_SKILL_DIR',skillDir],['CODEX_PRIMARY_RUNTIME_NODE_MODULES or RUNTIME_NODE_MODULES',modules]]){
   if(typeof value!=='string'||!path.isAbsolute(value))throw new Error(`Set ${name} to an actual absolute runtime directory.`);
   if(!(await fs.stat(value)).isDirectory())throw new Error(`${name} is not a directory.`);
  }
  for(const name of ['runtime_helpers.mjs','artifact_tool_utils.mjs','inspect_presentation_package_integrity.py','inspect_presentation_layout_geometry.py'])await fs.access(path.join(skillDir,'container_tools',name));
  pathsReady=true;checks.runtimePaths=result('passed','Runtime helpers and validators exist in the supplied directories.');
 }catch(error){checks.runtimePaths=result('failed',message(error));}
 if(pathsReady){
  try{
   // Run in a child so an explicit env option is respected and the portable process stays independent.
   const code=`import fs from 'node:fs/promises';
const helper=await import(${JSON.stringify(pathToFileURL(path.join(skillDir,'container_tools/runtime_helpers.mjs')).href)});
const artifact=await helper.importRuntimeModule('@oai/artifact-tool');
const utils=await import(${JSON.stringify(pathToFileURL(path.join(skillDir,'container_tools/artifact_tool_utils.mjs')).href)});
if(typeof artifact.Presentation?.create!=='function'||typeof utils.finalizePresentation!=='function')throw new Error('Required presentation API is unavailable');
const fonts=[];let inventoryAvailable=false;
for(const name of ['@napi-rs/canvas','skia-canvas'])try{const lib=await helper.requireRuntimeModule(name);const rows=name==='@napi-rs/canvas'?lib.GlobalFonts?.families?.map(x=>x.family):lib.FontLibrary?.families;if(Array.isArray(rows)){inventoryAvailable=true;fonts.push(...rows);}}catch{}
const pkg=JSON.parse(await fs.readFile(${JSON.stringify(path.join(modules,'@oai/artifact-tool/package.json'))},'utf8'));
console.log(JSON.stringify({version:pkg.version,fonts:[...new Set(fonts)],inventoryAvailable}));`;
   const stdout=execFileSync(process.execPath,['--input-type=module','-e',code],{env:{...process.env,...env},encoding:'utf8',timeout:30000,maxBuffer:1024*1024,stdio:['ignore','pipe','pipe']});
   const runtime=JSON.parse(stdout.trim());
   versions.artifactTool=runtime.version;
   checks.runtimeModules=result('passed','Artifact Tool and finalizer imported with the required API.');
   if(!runtime.inventoryAvailable)checks.fonts=result('failed','Could not discover fonts from the configured rendering runtime; supply a working font inventory before building.');
   else{
    const available=new Set(runtime.fonts.filter(v=>typeof v==='string').map(v=>v.toLowerCase()));
    const missing=fonts.filter(v=>!available.has(v.toLowerCase()));
    checks.fonts=missing.length?result('failed',`Missing rendering fonts: ${missing.join(', ')}. Set style.fonts to installed families and recheck layout.`):result('passed',`All requested font families are installed: ${fonts.join(', ')}. Glyph coverage and actual rendering still need inspection.`);
   }
  }catch(error){checks.runtimeModules=result('failed',message(error));}
 }
 try{
  if(typeof python!=='string'||!path.isAbsolute(python))throw new Error('Set DECK_RUNTIME_PYTHON to the actual absolute Python executable.');
  const stdout=execFileSync(python,['-c','import json,platform,lxml; print(json.dumps({"python":platform.python_version(),"lxml":lxml.__version__}))'],{env:{...process.env,...env},encoding:'utf8',timeout:10000,maxBuffer:65536,stdio:['ignore','pipe','pipe']});
  Object.assign(versions,JSON.parse(stdout.trim()));checks.python=result('passed','Configured Python executable imported lxml.');
 }catch(error){checks.python=result('failed',message(error));}
 return {checks,versions};
}

export async function preflight(input,{full=false,env=process.env,dependencies,probeRuntime=probeFullRuntime}={}){
 const checks={compilation:skipped('Literal document; no source calculations.'),contract:skipped('Input not validated.'),style:skipped('Input not validated.'),theme:skipped('Input not validated.'),runtimePaths:skipped('Portable mode does not probe a private runtime.'),runtimeModules:skipped('Portable mode does not import a private runtime.'),python:skipped('Portable mode does not require Python.'),fonts:skipped('Portable mode cannot prove installed fonts.')};
 const versions={node:process.version};
 let document=input,style;
 if(input&&typeof input==='object'&&(Object.hasOwn(input,'data')||Object.hasOwn(input,'presentation'))){
  try{document=compileDocument(input).document;checks.compilation=result('passed','Source calculations and bindings resolved.');}
  catch(error){checks.compilation=result('failed',message(error));return {version:1,status:'blocked',scope:full?'full':'portable',checks,versions};}
 }
 try{
  const deps=dependencies??await portableDependencies();
  try{deps.validateDocument(document);checks.contract=result('passed','Document fields and declared template capacities satisfy the shared contract.');}catch(error){checks.contract=result('failed',message(error));}
  try{style=deps.resolveStyle(document?.style);checks.style=result('passed',`Style configuration resolved${style.profile?` (${style.profile})`:''}.`);}catch(error){checks.style=result('failed',message(error));}
  try{createTheme(document?.theme??{});checks.theme=result('passed','Theme input and color-role contrast checks passed.');}catch(error){checks.theme=result('failed',message(error));}
 }catch(error){checks.contract=result('failed',`Cannot load portable validators: ${message(error)}`);}
 if(full&&style&&checks.contract.status==='passed'&&checks.theme.status==='passed'){
  try{const runtime=await probeRuntime({env,fonts:[...new Set(Object.values(style.fonts))]});Object.assign(checks,runtime.checks);Object.assign(versions,runtime.versions);}
  catch(error){checks.runtimeModules=result('failed',message(error));}
 }
 const failed=Object.values(checks).some(check=>check.status==='failed');
 const required=full?['runtimePaths','runtimeModules','python','fonts']:[];
 const complete=required.every(name=>checks[name].status==='passed');
 return {version:1,status:failed||!complete?'blocked':full?'full_checks_passed':'portable_checks_passed',scope:full?'full':'portable',checks,versions};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const {values}=parseArgs({options:{input:{type:'string'},full:{type:'boolean',default:false},out:{type:'string'}}});
 let report;
 try{
  if(!values.input)throw new Error('Missing --input <source-or-document.json>.');
  report=await preflight(JSON.parse(await fs.readFile(values.input,'utf8')),{full:values.full});
 }catch(error){report={version:1,status:'blocked',checks:{input:result('failed',message(error))},versions:{node:process.version}};}
 if(values.out){const output=path.resolve(values.out);await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify(report,null,2));
 if(report.status==='blocked')process.exitCode=1;
}
