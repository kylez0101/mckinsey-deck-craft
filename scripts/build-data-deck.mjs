import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {compileDocument} from './data-model.mjs';
import {createTheme} from './theme.mjs';
import {validateDocument} from './template-contract.mjs';
import {resolveStyle} from './style-profiles.mjs';

const within=(child,parent)=>{const rel=path.relative(parent,child);return rel===''||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel));};
export async function buildDataDeck(input,{workspaceDir,workDir,finalPath,dryRun=false}){
 for(const value of [workspaceDir,workDir,finalPath])if(!path.isAbsolute(value))throw new Error('workspaceDir, workDir and finalPath must be absolute paths');
 if(!within(workDir,workspaceDir)||!within(finalPath,workspaceDir))throw new Error('Build and final files must remain inside the supplied workspace');
 const compiled=compileDocument(input),theme=createTheme(compiled.document.theme??{});
 validateDocument(compiled.document);
 const style=resolveStyle(compiled.document.style);
 await fs.mkdir(workDir,{recursive:true});
 await fs.writeFile(path.join(workDir,'resolved.json'),JSON.stringify(compiled.document,null,2));
 await fs.writeFile(path.join(workDir,'calculation-audit.json'),JSON.stringify(compiled.audit,null,2));
 await fs.writeFile(path.join(workDir,'values.json'),JSON.stringify(compiled.values,null,2));
 await fs.writeFile(path.join(workDir,'theme.json'),JSON.stringify(theme,null,2));
 await fs.writeFile(path.join(workDir,'style.json'),JSON.stringify(style,null,2));
 if(dryRun)return {status:'compiled',values:compiled.values,audit:compiled.audit,theme,style};
 const {exportDeck}=await import('./build-deck.mjs');
 const result=await exportDeck(compiled.document,{workspaceDir,workDir,finalPath});
 await fs.writeFile(path.join(workDir,'build-result.json'),JSON.stringify(result,null,2));
 return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const {values}=parseArgs({options:{input:{type:'string'},out:{type:'string'},work:{type:'string'},workspace:{type:'string'},'dry-run':{type:'boolean',default:false}}});
 for(const name of ['input','out','work','workspace'])if(!values[name])throw new Error(`Missing --${name}`);
 const source=JSON.parse(await fs.readFile(values.input,'utf8'));
 const result=await buildDataDeck(source,{workspaceDir:path.resolve(values.workspace),workDir:path.resolve(values.work),finalPath:path.resolve(values.out),dryRun:values['dry-run']});
 console.log(JSON.stringify(values['dry-run']?{status:result.status,values:result.values}:result));
}
