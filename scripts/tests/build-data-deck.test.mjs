import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {buildDataDeck} from '../build-data-deck.mjs';

test('portable compilation writes resolved style without importing the private runtime',async t=>{
 const workspace=await fs.mkdtemp(path.join(os.tmpdir(),'deck-compile-'));
 t.after(()=>fs.rm(workspace,{recursive:true,force:true}));
 const source={data:{amount:0},presentation:{style:{profile:'generic'},slides:[{layout:'T01',title:'Portable source'}]}};
 const input=path.join(workspace,'source.json');await fs.writeFile(input,JSON.stringify(source));
 const work=path.join(workspace,'working'),out=path.join(workspace,'output','report.pptx');
 const env={...process.env};for(const key of ['DECK_PRESENTATIONS_SKILL_DIR','DECK_RUNTIME_PYTHON','CODEX_PRIMARY_RUNTIME_NODE_MODULES'])delete env[key];
 const result=execFileSync(process.execPath,['scripts/build-data-deck.mjs','--input',input,'--workspace',workspace,'--work',work,'--out',out,'--dry-run'],{cwd:new URL('../..',import.meta.url),env,encoding:'utf8'});
 assert.equal(JSON.parse(result).status,'compiled');
 assert.equal(JSON.parse(await fs.readFile(path.join(work,'style.json'),'utf8')).cover.background,null);
 await assert.rejects(fs.access(out));
});
test('invalid contracts or style block dry-run before writing stale-looking build artifacts',async t=>{
 const workspace=await fs.mkdtemp(path.join(os.tmpdir(),'deck-contract-'));
 t.after(()=>fs.rm(workspace,{recursive:true,force:true}));
 const work=path.join(workspace,'working');
 for(const presentation of [{slides:[{layout:'T01'}]},{style:{profile:'unsupported'},slides:[{layout:'T01',title:'Example'}]}]){
  await assert.rejects(buildDataDeck({data:{},presentation},{workspaceDir:workspace,workDir:work,finalPath:path.join(workspace,'output','report.pptx'),dryRun:true}));
  await assert.rejects(fs.access(work));
 }
});
