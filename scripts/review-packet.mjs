import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {loadFrozenEvaluation,verifyArtifact} from './evaluate.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const save=(file,value)=>fs.writeFile(file,JSON.stringify(value,null,2)+'\n');
const roles={presentation:['.pptx'],render:['.png','.jpg','.jpeg'],storyboard:['.md','.txt'],source:['.json']};
const metadataName=/(?:^|[-_.])(execution|acceptance|receipt|inventory|build-result|calculation-audit|assignment|prompt)(?:[-_.]|$)/iu;

/** Copy only coordinator-selected deliverables, source facts and renders for an assessor. */
export async function prepareReviewPacket({preparedDir,evidenceRoot,outputDir,runs}){
 const {manifest,expectations}=await loadFrozenEvaluation(preparedDir);
 if(!Array.isArray(runs)||!runs.length||new Set(runs.map(run=>run.runId)).size!==runs.length)throw new Error('Review runs must be a nonempty unique array.');
 const prepared=[];
 for(const run of runs){
  const assignment=manifest.assignments.find(item=>item.runId===run.runId);
  if(!assignment)throw new Error(`Unknown run ${run.runId}.`);
  if(!Array.isArray(run.artifacts)||!run.artifacts.length||new Set(run.artifacts.map(item=>item.id)).size!==run.artifacts.length)throw new Error('Review artifact IDs must be a nonempty unique array.');
  const artifacts=[];
  for(const artifact of run.artifacts){
   if(!roles[artifact.role])throw new Error(`Unsupported review role ${artifact.role}; metadata is not a deliverable.`);
   if(typeof artifact.id!=='string'||!/^[\w-]{1,80}$/u.test(artifact.id))throw new Error('Review artifact IDs must be bounded filename-safe identifiers.');
   if(typeof artifact.path!=='string'||metadataName.test(path.basename(artifact.path)))throw new Error('Execution and other method-identifying metadata must stay outside the review packet.');
   const extension=path.extname(artifact.path).toLowerCase();
   if(!roles[artifact.role].includes(extension))throw new Error(`Review role ${artifact.role} does not accept ${extension} files.`);
   await verifyArtifact(artifact,evidenceRoot);
   artifacts.push({id:artifact.id,role:artifact.role,path:`artifacts/${run.runId}/${artifact.id}${extension}`,sha256:artifact.sha256,source:await fs.realpath(path.resolve(evidenceRoot,artifact.path))});
  }
  prepared.push({runId:run.runId,caseId:assignment.caseId,brief:`briefs/${run.runId}/brief.json`,artifacts});
 }
 await fs.mkdir(outputDir,{recursive:false});
 for(const run of prepared){
  const directory=path.join(outputDir,path.dirname(run.brief));await fs.mkdir(directory,{recursive:true});
  const task=path.join(preparedDir,'tasks',run.runId);
  const brief=JSON.parse(await fs.readFile(path.join(task,'brief.json'),'utf8'));
  await save(path.join(outputDir,run.brief),brief);
  for(const attachment of brief.attachments??[]){
   if(path.basename(attachment)!==attachment)throw new Error('Frozen task attachments must use local basenames.');
   await fs.copyFile(path.join(task,attachment),path.join(directory,attachment),fs.constants.COPYFILE_EXCL);
  }
  for(const artifact of run.artifacts){
   const target=path.join(outputDir,artifact.path);await fs.mkdir(path.dirname(target),{recursive:true});
   await fs.copyFile(artifact.source,target,fs.constants.COPYFILE_EXCL);
   if(hash(await fs.readFile(target))!==artifact.sha256)throw new Error('Evidence changed while the review packet was copied.');
   delete artifact.source;
  }
 }
 const packet={version:1,suiteHash:manifest.suiteHash,skillHash:manifest.skillHash,runs:prepared};
 await save(path.join(outputDir,'packet.json'),packet);
 await save(path.join(outputDir,'criteria.json'),{cases:Object.fromEntries(prepared.map(run=>[run.caseId,expectations.cases[run.caseId]]))});
 await save(path.join(outputDir,'assessment-template.json'),{suiteHash:manifest.suiteHash,skillHash:manifest.skillHash,evaluator:{id:'',independent:false},runs:prepared.map(run=>({runId:run.runId,caseId:run.caseId,artifacts:run.artifacts.map(({role,...artifact})=>artifact),checks:expectations.cases[run.caseId].checks.map(({id})=>({id,status:'not_run',evidence:[]}))}))});
 return {status:'review_packet_prepared',runs:prepared.length,directory:outputDir};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const {values}=parseArgs({options:{prepared:{type:'string'},selection:{type:'string'},'evidence-root':{type:'string'},out:{type:'string'}}});
 for(const key of ['prepared','selection','evidence-root','out'])if(!values[key])throw new Error(`Missing --${key}.`);
 const selection=JSON.parse(await fs.readFile(values.selection,'utf8'));
 console.log(JSON.stringify(await prepareReviewPacket({preparedDir:path.resolve(values.prepared),evidenceRoot:path.resolve(values['evidence-root']),outputDir:path.resolve(values.out),runs:selection.runs})));
}
