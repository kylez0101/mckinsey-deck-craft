import test from 'node:test';
import assert from 'node:assert/strict';
import {createAcceptance, recordCheck, assertArtifact} from '../acceptance.mjs';

const sha='a'.repeat(64), file='/tmp/report.pptx';
const create=()=>createAcceptance({file,sha256:sha,machineEvidence:'/tmp/finalization.json',renders:'/tmp/renders'});

test('a build receipt proves machine checks only, even when renders exist',()=>{
 const receipt=create();
 assert.equal(receipt.status,'machine_checks_passed');
 assert.equal(receipt.checks.structureData.status,'passed');
 for(const name of ['content','visual','editReopen','targetApplication'])assert.equal(receipt.checks[name].status,'not_run');
 assert.equal(receipt.renders,'/tmp/renders');
});

test('final acceptance requires separate evidence for every check',()=>{
 let receipt=create();
 for(const name of ['content','visual','editReopen'])receipt=recordCheck(receipt,name,{status:'passed',evidence:[`/tmp/${name}.json`],sha256:sha});
 assert.equal(receipt.status,'machine_checks_passed');
 receipt=recordCheck(receipt,'targetApplication',{status:'passed',evidence:[{path:'/tmp/powerpoint.json',description:'Representative edits in PowerPoint'}],sha256:sha});
 assert.equal(receipt.status,'verified');
});

test('failed or unperformed checks cannot silently become acceptance',()=>{
 const receipt=create();
 const failed=recordCheck(receipt,'visual',{status:'failed',evidence:['/tmp/overlap.png'],sha256:sha});
 assert.equal(failed.status,'blocked');
 const pending=recordCheck(failed,'visual',{status:'not_run',evidence:[],sha256:sha});
 assert.equal(pending.status,'machine_checks_passed');
 assert.equal(pending.checks.visual.status,'not_run');
 assert.equal(receipt.checks.visual.status,'not_run');
});

test('passed and failed checks require inspectable evidence and known check names',()=>{
 for(const status of ['passed','failed'])assert.throws(()=>recordCheck(create(),'visual',{status,evidence:[],sha256:sha}),/evidence/u);
 assert.throws(()=>recordCheck(create(),'visual',{status:'passed',evidence:[{description:'Looks good'}],sha256:sha}),/path/u);
 assert.throws(()=>recordCheck(create(),'visual',{status:'passed',evidence:['https://'],sha256:sha}),/path/u);
 assert.throws(()=>recordCheck(create(),'unknown',{status:'passed',evidence:['/tmp/check.json'],sha256:sha}),/Unknown check/u);
 assert.throws(()=>recordCheck(create(),'visual',{status:'skipped',evidence:[],sha256:sha}),/status/u);
});

test('approvals are bound to the exact exported artifact and do not mutate the source receipt',()=>{
 const receipt=create();
 assert.throws(()=>recordCheck(receipt,'visual',{status:'passed',evidence:['/tmp/check.json'],sha256:'b'.repeat(64)}),/SHA/u);
 assert.throws(()=>recordCheck(receipt,'visual',{status:'passed',evidence:['/tmp/check.json']}),/SHA/u);
 assert.throws(()=>assertArtifact(receipt,{file:'/tmp/other.pptx',sha256:sha}),/file/u);
 assert.throws(()=>assertArtifact(receipt,{file,sha256:'b'.repeat(64)}),/SHA/u);
 assert.equal(assertArtifact(receipt,{file,sha256:sha}),receipt);
 const evidence=[{path:'/tmp/check.json'}];
 const updated=recordCheck(receipt,'visual',{status:'passed',evidence,sha256:sha});
 evidence[0].path='/tmp/changed.json';
 assert.equal(updated.checks.visual.evidence[0].path,'/tmp/check.json');
 assert.equal(receipt.checks.visual.status,'not_run');
});

test('a hand-edited receipt cannot retain a completed check without its evidence',()=>{
 const receipt=create();receipt.checks.content={status:'passed',evidence:[]};
 assert.throws(()=>recordCheck(receipt,'visual',{status:'passed',evidence:['/tmp/check.json'],sha256:sha}),/evidence/u);
});

test('receipt creation rejects missing machine evidence, unbounded file identity and malformed hashes',()=>{
 assert.throws(()=>createAcceptance({file,sha256:sha,machineEvidence:[]}),/evidence/u);
 assert.throws(()=>createAcceptance({file:'relative.pptx',sha256:sha,machineEvidence:'/tmp/proof.json'}),/absolute/u);
 assert.throws(()=>createAcceptance({file,sha256:'abc',machineEvidence:'/tmp/proof.json'}),/SHA/u);
});
