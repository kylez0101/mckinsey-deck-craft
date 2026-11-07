import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {compileDocument} from '../data-model.mjs';
import {templateContract, allowedSlideFields, allowedDataPageFields, validateSlide, validateDocument, templateDefaults} from '../template-contract.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = async path => JSON.parse(await fs.readFile(new URL(`../../${path}`, import.meta.url),'utf8'));
const cover = () => ({layout:'T01',title:'A decision'});
const table = () => ({layout:'A05',title:'Options',headers:['Option','Cost'],rows:[['A',0],['B','Unknown']]});

test('legacy basic and compiled data examples remain valid without loading a presentation runtime', async () => {
 const basic=await read('assets/templates/page-library.json');
 assert.equal(validateDocument(basic),basic);
 const {document}=compileDocument(await read('assets/templates/data-layout-source.json'));
 assert.equal(validateDocument(document),document);
 assert.equal(templateContract.templates.length,16);
});

test('canonical fields retain optional supported controls in the public catalog', () => {
 assert(allowedSlideFields('T06').includes('roleHeaders'));
 assert(allowedSlideFields('T10').includes('decisionHeading'));
 assert.deepEqual(allowedDataPageFields.A06,['headers','rows','numericColumns','highlightRow','columnWidths','caption','takeaway','insights']);
 assert.equal(templateDefaults('T10').decisionHeading,'需要确认');
});

test('common required fields, unknown fields and malformed shapes fail before runtime import', () => {
 assert.throws(()=>validateSlide(null),/object/);
 assert.throws(()=>validateSlide({layout:'T99',title:'Unknown'}),/Unsupported layout/);
 assert.throws(()=>validateSlide({layout:'T01'}),/title.*required/);
 assert.throws(()=>validateSlide({...cover(),title:''}),/title.*non-empty/);
 assert.throws(()=>validateSlide({...cover(),discardMe:'evidence'}),/unknown fields discardMe/);
 assert.throws(()=>validateDocument({slides:[cover()],discardMe:1}),/unknown fields discardMe/);
 assert.throws(()=>validateSlide({...table(),rows:'rows'}),/rows.*array/);
 assert.throws(()=>validateSlide({...table(),rows:[['A',null],['B',0]]}),/rows\[0\]\[1\]/);
});

test('canonical capacities reject too many rows, incomplete rows and unpaired numeric series', () => {
 assert.throws(()=>validateSlide({...table(),rows:Array.from({length:6},()=>['A',0])}),/rows.*2.*5/);
 assert.throws(()=>validateSlide({...table(),rows:[['A'],['B',0]]}),/columns/);
 assert.throws(()=>validateSlide({layout:'T03',title:'Facts',chart:{heading:'Values',categories:['A','B'],values:[1],unit:'元'},facts:[{label:'One',text:'Evidence'}]}),/chart.values.*2.*5|match/);
 assert.throws(()=>validateSlide({layout:'T02',title:'Summary',sections:[{heading:'A',text:'A'}]}),/sections.*3/);
});

test('single-slide mode is explicit and does not add a cover or mutate inputs', () => {
 const input={mode:'single-slide',slides:[table()],style:{profile:'generic'},theme:{primary:'#123456'}};
 const snapshot=structuredClone(input);
 assert.equal(validateDocument(input),input);
 assert.deepEqual(input,snapshot);
 assert.throws(()=>validateDocument({slides:[table()]}),/cover T01/);
 assert.throws(()=>validateDocument({mode:'single-slide',slides:[cover(),table()]}),/exactly one/);
 assert.throws(()=>validateDocument({mode:'unknown',slides:[cover()]}),/mode/);
 const sparse={slides:[cover(),,table()]};
 assert.throws(()=>validateDocument(sparse),/sparse slide array/);
});

test('conditional flow, timeline dimensions and nested unknown fields fail closed', () => {
 const flow={layout:'T06',title:'Release',steps:['A','B','C'],releaseConditions:[['One','Ready'],['Two','Ready']]};
 assert.equal(validateSlide(flow),flow);
 assert.throws(()=>validateSlide({...flow,roles:[['A','B','C']]}),/cannot combine/);
 assert.throws(()=>validateSlide({...flow,steps:['A','B','C','D']}),/exactly 3/);
 const timeline={layout:'T08',title:'Plan',periods:['1','2','3','4'],rows:[['A','','2','3','4'],['B','1','2','3','4']]};
 assert.equal(validateSlide(timeline),timeline);
 assert.throws(()=>validateSlide({...timeline,phases:[{name:'All',span:3}]}),/phase spans/);
 assert.throws(()=>validateSlide({layout:'T03',title:'Facts',chart:{heading:'Values',categories:['A','B'],values:[1,2],unit:'元',fake:1},facts:[{label:'One',text:'Evidence'}]}),/unknown fields fake/);
});

test('generated JSON and Markdown catalog are exactly synchronized with the contract', () => {
 assert.doesNotThrow(()=>execFileSync(process.execPath,['scripts/sync-template-catalog.mjs','--check'],{cwd:root,stdio:'pipe'}));
});
