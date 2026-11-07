import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {preflight} from '../preflight.mjs';

const document=()=>({slides:[{layout:'T01',title:'Synthetic example'}]});
const dependencies={validateDocument:value=>{if(!value.slides?.length)throw new Error('slides required');return value;},resolveStyle:value=>{if(value?.profile==='missing')throw new Error('unknown profile');return {fonts:{title:'Example Serif',body:'Example Sans'}};}};

test('portable preflight validates literal documents without probing a private runtime',async()=>{
 const result=await preflight(document(),{env:{},dependencies,probeRuntime:()=>{throw new Error('must not probe');}});
 assert.equal(result.status,'portable_checks_passed');
 assert.equal(result.checks.contract.status,'passed');
 assert.equal(result.checks.runtimeModules.status,'not_run');
 assert.equal(result.checks.fonts.status,'not_run');
});

test('source bindings are compiled and null is not substituted with zero',async()=>{
 const good={data:{title:'A bound title'},presentation:{slides:[{layout:'T01',title:{ref:'data.title'}}]}};
 const result=await preflight(good,{dependencies,env:{}});
 assert.equal(result.status,'portable_checks_passed');
 assert.equal(result.checks.compilation.status,'passed');
 const bad={data:{cost:null},calculated:{total:{op:'add',args:[{ref:'data.cost'},1]}},presentation:document()};
 const rejected=await preflight(bad,{dependencies,env:{}});
 assert.equal(rejected.status,'blocked');
 assert.equal(rejected.checks.compilation.status,'failed');
 assert.equal(rejected.checks.contract.status,'not_run');
});

test('invalid theme, style and structure block the report with separate diagnostics',async()=>{
 for(const [input,check] of [[{...document(),theme:{primary:'not-a-color'}},'theme'],[{...document(),style:{profile:'missing'}},'style'],[{slides:[]},'contract']]){
  const result=await preflight(input,{dependencies,env:{}});
  assert.equal(result.status,'blocked');assert.equal(result.checks[check].status,'failed');
 }
});

test('full checks pass actual requested fonts to the runtime probe and keep unavailable capabilities visible',async()=>{
 let requested;
 const probeRuntime=async options=>{
  requested=options.fonts;
  return {checks:{runtimePaths:{status:'passed',details:'available'},runtimeModules:{status:'passed',details:'imported'},python:{status:'passed',details:'lxml imported'},fonts:{status:'failed',details:'Missing Example Serif'}},versions:{artifactTool:'test-fixture',python:'test-fixture'}};
 };
 const result=await preflight(document(),{full:true,dependencies,env:{},probeRuntime});
 assert.deepEqual(requested,['Example Serif','Example Sans']);
 assert.equal(result.status,'blocked');assert.equal(result.checks.fonts.status,'failed');
 assert.equal(result.versions.artifactTool,'test-fixture');
});

test('missing full-runtime configuration fails honestly without trying imports',async()=>{
 const result=await preflight(document(),{full:true,dependencies,env:{}});
 assert.equal(result.status,'blocked');assert.equal(result.checks.runtimePaths.status,'failed');
 assert.equal(result.checks.runtimeModules.status,'not_run');
 assert.equal(result.checks.fonts.status,'not_run');
});

test('full preflight reports success only after every requested capability passes',async()=>{
 const probeRuntime=async()=>({checks:Object.fromEntries(['runtimePaths','runtimeModules','python','fonts'].map(name=>[name,{status:'passed',details:'test fixture'}])),versions:{artifactTool:'fixture'}});
 const result=await preflight(document(),{full:true,dependencies,env:{},probeRuntime});
 assert.equal(result.status,'full_checks_passed');
 const incomplete=await preflight(document(),{full:true,dependencies,env:{},probeRuntime:async()=>({checks:{runtimeModules:{status:'passed',details:'partial probe'}},versions:{}})});
 assert.equal(incomplete.status,'blocked');
 assert.equal(incomplete.checks.fonts.status,'not_run');
});

test('CLI writes its portable report and sets a failing exit code for rejected input',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'deck-preflight-'));
 const input=path.join(dir,'input.json'),output=path.join(dir,'report.json');
 const script=fileURLToPath(new URL('../preflight.mjs',import.meta.url));
 try{
  await fs.writeFile(input,JSON.stringify(document()));
  execFileSync(process.execPath,[script,'--input',input,'--out',output],{env:{...process.env,DECK_PRESENTATIONS_SKILL_DIR:'',DECK_RUNTIME_PYTHON:'',CODEX_PRIMARY_RUNTIME_NODE_MODULES:''}});
  assert.equal(JSON.parse(await fs.readFile(output,'utf8')).status,'portable_checks_passed');
  await fs.writeFile(input,JSON.stringify({slides:[]}));
  assert.throws(()=>execFileSync(process.execPath,[script,'--input',input],{stdio:'pipe'}),error=>error.status===1);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
