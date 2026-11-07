import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {prepareEvaluation,scoreEvaluation} from '../evaluate.mjs';
import {prepareReviewPacket} from '../review-packet.mjs';

const json=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'deck-review-packet-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const skill=path.join(root,'skill');await fs.mkdir(skill);await fs.writeFile(path.join(skill,'SKILL.md'),'Synthetic test-only skill.');
 const preparedDir=path.join(root,'prepared');await prepareEvaluation({outputDir:preparedDir,skillPath:skill,seed:'review-packet-test'});
 const manifest=await json(path.join(preparedDir,'assignments.private.json'));
 const assignment=manifest.assignments.find(run=>run.caseId==='single-slide-edit');
 const evidenceRoot=path.join(root,'evidence');await fs.mkdir(evidenceRoot);
 const bytes=Buffer.from('Synthetic presentation bytes: packet integrity test only.');await fs.writeFile(path.join(evidenceRoot,'report.pptx'),bytes);
 await fs.writeFile(path.join(evidenceRoot,'execution.json'),JSON.stringify({method:'skill',skillPath:skill}));
 const runs=[{runId:assignment.runId,artifacts:[{id:'deck',role:'presentation',path:'report.pptx',sha256:hash(bytes)}]}];
 return {preparedDir,evidenceRoot,runs,outputDir:path.join(root,'review'),root,manifest};
}
test('review packet copies only selected artifacts and frozen facts, without method metadata',async t=>{
 const f=await fixture(t);const result=await prepareReviewPacket(f);
 assert.equal(result.status,'review_packet_prepared');
 const packet=await json(path.join(f.outputDir,'packet.json'));
 assert.equal(packet.runs.length,1);assert.equal(packet.runs[0].artifacts[0].role,'presentation');
 const metadata=JSON.stringify(packet);
 assert.doesNotMatch(metadata,/condition|skillPath|promptHash|briefHash|method|execution\.json/);
 assert.equal(hash(await fs.readFile(path.join(f.outputDir,packet.runs[0].artifacts[0].path))),f.runs[0].artifacts[0].sha256);
 const brief=await json(path.join(f.outputDir,packet.runs[0].brief));
 assert.equal(brief.id,'single-slide-edit');assert.deepEqual(brief.attachments,['single-slide-source.json']);
 await fs.access(path.join(f.outputDir,path.dirname(packet.runs[0].brief),'single-slide-source.json'));
 const report=await json(path.join(f.outputDir,'assessment-template.json'));report.evaluator={id:'synthetic-independent-test',independent:true};
 report.runs[0].checks=report.runs[0].checks.map(check=>({...check,status:'passed',evidence:[{artifactId:'deck',locator:'test-only file',observation:'Synthetic assertion used only to validate report compatibility.'}]}));
 const scored=await scoreEvaluation({preparedDir:f.preparedDir,report,evidenceRoot:f.outputDir});assert.equal(scored.runs.find(run=>run.runId===f.runs[0].runId).status,'passed');
});
test('execution logs and metadata roles cannot enter a review packet',async t=>{
 const f=await fixture(t);const bytes=await fs.readFile(path.join(f.evidenceRoot,'execution.json'));
 f.runs[0].artifacts=[{id:'execution',role:'source',path:'execution.json',sha256:hash(bytes)}];
 await assert.rejects(prepareReviewPacket(f),/execution|metadata/);
 await assert.rejects(fs.access(f.outputDir));
 f.runs[0].artifacts=[{id:'log',role:'metadata',path:'execution.json',sha256:hash(bytes)}];
 await assert.rejects(prepareReviewPacket(f),/role|metadata/);
});
test('changed frozen prompts, evidence bytes and escaping files are rejected before packaging',async t=>{
 const f=await fixture(t);await fs.writeFile(path.join(f.evidenceRoot,'report.pptx'),'changed');
 await assert.rejects(prepareReviewPacket(f),/hash differs/);
 await fs.writeFile(path.join(f.evidenceRoot,'report.pptx'),'Synthetic presentation bytes: packet integrity test only.');
 f.runs[0].artifacts[0].path='../outside.pptx';await assert.rejects(prepareReviewPacket(f),/escapes/);
 f.runs[0].artifacts[0].path='report.pptx';
 await fs.writeFile(path.join(f.preparedDir,'tasks',f.runs[0].runId,'prompt.txt'),'Changed task instructions');
 await assert.rejects(prepareReviewPacket(f),/prompt has changed/);
});
test('unknown runs, duplicate artifact IDs and repeated output directories are rejected',async t=>{
 const f=await fixture(t);f.runs.push(f.runs[0]);await assert.rejects(prepareReviewPacket(f),/unique/);f.runs.pop();
 f.runs[0].artifacts.push(f.runs[0].artifacts[0]);await assert.rejects(prepareReviewPacket(f),/unique/);f.runs[0].artifacts.pop();
 const original=f.runs[0].runId;f.runs[0].runId='unknown';await assert.rejects(prepareReviewPacket(f),/Unknown run/);f.runs[0].runId=original;
 await prepareReviewPacket(f);await assert.rejects(prepareReviewPacket(f),/exist|EEXIST/);
});
