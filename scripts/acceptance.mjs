import path from 'node:path';

export const acceptanceChecks=Object.freeze(['structureData','content','visual','editReopen','targetApplication']);
const statuses=new Set(['passed','failed','not_run']);
const validHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/iu.test(value);
const identity=(file,sha256)=>{
 if(typeof file!=='string'||!path.isAbsolute(file))throw new Error('Artifact file must be an absolute path.');
 if(!validHash(sha256))throw new Error('Artifact SHA-256 must be a 64-character hex digest.');
};
function evidenceList(value,required){
 const entries=Array.isArray(value)?value:value===undefined?[]:[value];
 if(required&&!entries.length)throw new Error('A completed check needs inspectable evidence.');
 return entries.map(entry=>{
  const record=typeof entry==='string'?{path:entry}:entry;
  let https=false;
  try{const url=new URL(record?.path);https=url.protocol==='https:'&&!!url.hostname;}catch{}
  if(!record||typeof record!=='object'||typeof record.path!=='string'||!(path.isAbsolute(record.path)||https))throw new Error('Evidence needs an absolute path or HTTPS URL.');
  if(record.description!==undefined&&(typeof record.description!=='string'||!record.description.trim()))throw new Error('Evidence description must be nonempty text.');
  return {path:record.path,...(record.description===undefined?{}:{description:record.description})};
 });
}
function overall(checks){
 if(acceptanceChecks.some(name=>checks[name].status==='failed'))return 'blocked';
 if(acceptanceChecks.every(name=>checks[name].status==='passed'))return 'verified';
 return checks.structureData.status==='passed'?'machine_checks_passed':'pending';
}

/** A build can establish structure/data checks. Render files are evidence to inspect, not visual approval. */
export function createAcceptance({file,sha256,machineEvidence,renders}){
 identity(file,sha256);
 if(renders!==undefined&&(typeof renders!=='string'||!path.isAbsolute(renders)))throw new Error('Render directory must be an absolute path.');
 const evidence=evidenceList(machineEvidence,true);
 return {version:1,file,sha256:sha256.toLowerCase(),status:'machine_checks_passed',
  ...(renders===undefined?{}:{renders}),
  checks:Object.fromEntries(acceptanceChecks.map(name=>[name,{status:name==='structureData'?'passed':'not_run',evidence:name==='structureData'?evidence:[]}]))};
}

/** Compare identity with a freshly calculated file hash before recording or reusing any approval. */
export function assertArtifact(receipt,{file,sha256}){
 identity(file,sha256);
 if(receipt.file!==file)throw new Error('Receipt file does not match the inspected artifact file.');
 if(receipt.sha256!==sha256.toLowerCase())throw new Error('Artifact SHA-256 changed; create a fresh receipt and repeat affected checks.');
 return receipt;
}

/** Pure receipt update: callers must actually perform the check and verify evidence files themselves. */
export function recordCheck(receipt,name,{status,evidence=[],sha256}){
 if(!acceptanceChecks.includes(name))throw new Error(`Unknown check ${name}.`);
 if(!statuses.has(status))throw new Error('Check status must be passed, failed or not_run.');
 assertArtifact(receipt,{file:receipt.file,sha256});
 for(const key of acceptanceChecks){
  if(!receipt.checks?.[key]||!statuses.has(receipt.checks[key].status))throw new Error(`Malformed receipt check ${key}.`);
  evidenceList(receipt.checks[key].evidence,receipt.checks[key].status!=='not_run');
 }
 const next=structuredClone(receipt);
 next.checks[name]={status,evidence:evidenceList(evidence,status!=='not_run')};
 next.status=overall(next.checks);
 return next;
}
