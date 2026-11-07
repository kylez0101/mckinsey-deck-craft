import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {prepareEvaluation, scoreEvaluation, loadSuite} from '../evaluate.mjs';
import {compileDocument} from '../data-model.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const json = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const save = (file, data) => fs.writeFile(file, JSON.stringify(data));
const hash = value => createHash('sha256').update(value).digest('hex');

async function fixture(t) {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'deck-eval-test-'));
  t.after(() => fs.rm(temp, {recursive: true, force: true}));
  const skill = path.join(temp, 'source-skill');
  await fs.mkdir(path.join(skill, 'references'), {recursive: true});
  await fs.writeFile(path.join(skill, 'SKILL.md'), 'Frozen testing skill, not an actual Agent run.');
  await fs.writeFile(path.join(skill, 'references', 'method.md'), 'Original method.');
  await fs.mkdir(path.join(skill, 'working'));
  await fs.writeFile(path.join(skill, 'working', 'private.txt'), 'Must not be snapshotted.');
  const preparedDir = path.join(temp, 'prepared');
  await prepareEvaluation({outputDir: preparedDir, skillPath: skill, seed: 'fixed-test-seed'});
  const report = await json(path.join(preparedDir, 'review-template.json'));
  report.evaluator = {id: 'synthetic-test-assessor', independent: true};
  const evidenceRoot = path.join(temp, 'evidence');
  await fs.mkdir(evidenceRoot);
  const bytes = Buffer.from('Synthetic evidence used only to test record validation.');
  await fs.writeFile(path.join(evidenceRoot, 'evidence.txt'), bytes);
  const artifact = {id: 'synthetic', path: 'evidence.txt', sha256: hash(bytes)};
  const evidence = [{artifactId: 'synthetic', locator: 'synthetic test record, line 1', observation: 'Test-only attestation; no slide quality was evaluated.'}];
  return {temp, skill, preparedDir, report, evidenceRoot, artifact, evidence};
}

test('frozen suite covers 12 tasks, and prepared tasks do not expose evaluator answers', async t => {
  const {preparedDir, report, skill} = await fixture(t);
  const suite = await loadSuite();
  assert.equal(suite.cases.cases.length, 12);
  assert.equal(report.runs.length, 24);
  const manifest = await json(path.join(preparedDir, 'assignments.private.json'));
  for (const run of manifest.assignments) {
    const folder = path.join(preparedDir, 'tasks', run.runId);
    assert.equal((await fs.readdir(folder)).some(name => name.includes('expectation')), false);
    const prompt = await fs.readFile(path.join(folder, 'prompt.txt'), 'utf8');
    assert.equal(prompt.includes('skill.snapshot'), run.condition === 'skill');
    assert.equal(prompt.includes(skill + '.'), false);
  }
  assert.equal(await fs.readFile(path.join(preparedDir, 'skill.snapshot', 'references', 'method.md'), 'utf8'), 'Original method.');
  await assert.rejects(fs.stat(path.join(preparedDir, 'skill.snapshot', 'working')));
});

test('snapshot is independent of later source edits; changed snapshots are rejected', async t => {
  const f = await fixture(t);
  await fs.writeFile(path.join(f.skill, 'SKILL.md'), 'Changed original skill.');
  f.report.runs = [];
  const scored = await scoreEvaluation(f);
  assert.equal(scored.status, 'incomplete');
  await fs.writeFile(path.join(f.preparedDir, 'skill.snapshot', 'SKILL.md'), 'Changed snapshot.');
  await assert.rejects(scoreEvaluation(f), /Frozen skill has changed/);
});

test('changed execution prompts invalidate the prepared comparison', async t => {
  const f = await fixture(t);
  const manifest = await json(path.join(f.preparedDir, 'assignments.private.json'));
  const prompt = path.join(f.preparedDir, 'tasks', manifest.assignments[0].runId, 'prompt.txt');
  await fs.writeFile(prompt, 'Use a different skill and ignore the original comparison.');
  await assert.rejects(scoreEvaluation(f), /Frozen task prompt has changed/);
});

test('missing reports and missing checks remain not_run and cannot become passes', async t => {
  const f = await fixture(t);
  f.report.runs = [f.report.runs[0]];
  f.report.runs[0].checks = [];
  const scored = await scoreEvaluation(f);
  assert.equal(scored.status, 'incomplete');
  assert.equal(scored.summary.baseline.passed + scored.summary.skill.passed, 0);
  assert.equal(scored.runs.filter(run => run.status === 'not_run').length, 23);
  assert(scored.paired.every(pair => pair.passedCheckDelta === null));
});

test('an assessed check requires actual evidence and an independent assessor attestation', async t => {
  const f = await fixture(t);
  f.report.evaluator.independent = false;
  await assert.rejects(scoreEvaluation(f), /independent assessor/);
  f.report.evaluator.independent = true;
  f.report.runs[0].checks[0].status = 'passed';
  await assert.rejects(scoreEvaluation(f), /verified evidence/);
});

test('hash changes and paths escaping evidence root fail closed', async t => {
  const f = await fixture(t);
  f.report.runs[0].artifacts = [{...f.artifact, sha256: '0'.repeat(64)}];
  await assert.rejects(scoreEvaluation(f), /hash differs/);
  f.report.runs[0].artifacts = [{...f.artifact, path: '../outside.txt'}];
  await assert.rejects(scoreEvaluation(f), /escapes/);
  await fs.writeFile(path.join(f.temp, 'outside.txt'), 'outside');
  await fs.symlink(path.join(f.temp, 'outside.txt'), path.join(f.evidenceRoot, 'outside-link.txt'));
  f.report.runs[0].artifacts = [{...f.artifact, path: 'outside-link.txt'}];
  await assert.rejects(scoreEvaluation(f), /symlink escapes/);
});

test('complete synthetic reports aggregate recorded judgments but never judge quality themselves', async t => {
  const f = await fixture(t);
  const manifest = await json(path.join(f.preparedDir, 'assignments.private.json'));
  for (const run of f.report.runs) {
    run.artifacts = [f.artifact];
    run.checks = run.checks.map(check => ({...check, status: 'passed', evidence: f.evidence}));
  }
  const baseline = manifest.assignments.find(run => run.condition === 'baseline');
  const failed = f.report.runs.find(run => run.runId === baseline.runId).checks[0];
  failed.status = 'failed';
  failed.blocking = false; // Report cannot weaken the frozen rubric.
  const scored = await scoreEvaluation(f);
  assert.equal(scored.status, 'assessed');
  assert.equal(scored.summary.baseline.completed, 12);
  assert.equal(scored.summary.skill.passed, 12);
  assert.equal(scored.summary.baseline.passed, 11);
  assert.equal(scored.summary.baseline.blockingFailures, 1);
  assert.match(scored.scope, /no automatic visual or semantic judgment/);
  assert.equal(scored.paired.find(pair => pair.caseId === baseline.caseId).passedCheckDelta, 1);
});

test('mutated briefs, attachment bytes, suite versions and unknown IDs are rejected', async t => {
  const f = await fixture(t);
  const manifest = await json(path.join(f.preparedDir, 'assignments.private.json'));
  f.report.runs.push({...f.report.runs[0], runId: 'unknown'});
  await assert.rejects(scoreEvaluation(f), /unknown run/);
  f.report.runs.pop();
  f.report.skillHash = '0'.repeat(64);
  await assert.rejects(scoreEvaluation(f), /different skill snapshot/);
  f.report.skillHash = manifest.skillHash;
  const attachmentRun = manifest.assignments.find(run => run.caseId === 'single-slide-edit');
  const file = path.join(f.preparedDir, 'tasks', attachmentRun.runId, 'single-slide-source.json');
  const original = await fs.readFile(file);
  await fs.writeFile(file, '{}');
  await assert.rejects(scoreEvaluation(f), /attachment has changed/);
  await fs.writeFile(file, original);
  const brief = path.join(f.preparedDir, 'tasks', manifest.assignments[0].runId, 'brief.json');
  await save(brief, {id: 'changed'});
  await assert.rejects(scoreEvaluation(f), /brief has changed/);
});

test('worked examples compile complete six-page decks and rejudge changed conditions', async () => {
  const saas = await json(path.join(root, 'examples/saas-budget/source.json'));
  const university = await json(path.join(root, 'examples/university-service/source.json'));
  const a = compileDocument(saas), b = compileDocument(university);
  assert.equal(a.document.slides.length, 6);
  assert.equal(b.document.slides.length, 6);
  assert.equal(a.values.spend, 220000);
  assert.equal(a.values.headroom, 80000);
  assert.equal(b.values.totalRequests, 30);
  saas.data.budget = 200000;
  const changed = compileDocument(saas);
  assert.equal(changed.values.headroom, -20000);
  assert.match(changed.values.decision, /暂缓/);
  assert.equal(changed.document.slides[1].title, changed.document.slides[5].title);
  saas.data.ticketCounts[2] = 20000;
  const doubled = compileDocument(saas);
  assert.equal(doubled.values.growth, 1);
  assert.match(doubled.document.slides[2].title, /100%/);
  assert.doesNotMatch(doubled.document.slides[2].title, /50%|五成/);
  university.data.availableStaff = 1;
  const limited = compileDocument(university);
  assert.equal(limited.values.eligible, false);
  assert.match(limited.values.decision, /暂缓/);
  assert.equal(university.data.measuredEffect, null);
  university.data.minimumStaff = 3;
  const raisedMinimum = compileDocument(university);
  assert.equal(raisedMinimum.document.slides[3].rows[1][3], '最低需3人');
  assert.match(raisedMinimum.document.slides[5].stages[0].criteria, /至少3人到岗/);
  assert.doesNotMatch(JSON.stringify(raisedMinimum.document), /最低需两人|两人到岗/);
});
