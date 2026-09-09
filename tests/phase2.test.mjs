import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoRun, demoStepOperation } from '../src/services/demoWorkflow.ts';
import { createScreeningRunner } from '../src/services/screeningRun.ts';
import { createCaseRepository } from '../src/services/caseRepository.ts';
import { demoScenarios } from '../src/mocks/screeningData.ts';
import { hasCompleteResult } from '../src/utils/screeningStatus.ts';

async function run(scenario, liveness = 'live', repo = createCaseRepository()) {
  const record = createDemoRun(scenario, [], undefined, liveness);
  const result = await createScreeningRunner().run(record, demoStepOperation(0), update =>
    repo.upsert({ ...update, caseStatus: update.status === 'completed' ? 'under_review' : 'open' }));
  return { result: repo.find(result.id), repo };
}

for (const scenario of demoScenarios) {
  test(scenario.id + ': input to evidence/result preserves identity and awaits an officer', async () => {
    const { result, repo } = await run(scenario.id);
    assert.equal(hasCompleteResult(result), true);
    assert.equal(result.demo.scenarioId, scenario.id);
    assert.ok(result.selfie);
    assert.ok(result.evidence.length >= 4);
    assert.ok(result.evidence.every(item => item.id.startsWith(result.id + '-evidence-')));
    assert.equal(result.officerReview, undefined);
    assert.equal(repo.getSnapshot().listItems.find(item => item.id === result.id).status, 'under_review');
    assert.equal(repo.find(result.caseNumber), result);
    const validation = result.validationResult;
    assert.equal(validation.checks.length, validation.passed + validation.failed + validation.warnings + validation.notChecked);
    const watchlist = validation.checks.find(check => check.id === 'v11');
    assert.equal(watchlist.status, 'not_checked');
    assert.match(watchlist.description, /no government database/);
    assert.ok(result.riskResult.explanation.some(line => line.includes('not accessed')));
  });
}

test('sample runs allocate distinct identities; uploaded files require a selfie and explicit scenario', () => {
  assert.notEqual(createDemoRun('genuine-passport').id, createDemoRun('genuine-passport').id);
  const document = { id: 'input', name: 'input.png', type: 'image/png', size: 50, preview: 'blob:input', documentType: 'other', uploadedAt: new Date() };
  assert.throws(() => createDemoRun('genuine-passport', [document]), /selfie/);
  assert.throws(() => createDemoRun('not-a-scenario'), /Unknown scenario/);
  const record = createDemoRun('genuine-passport', [document], { ...document, name: 'selfie.png' });
  assert.equal(record.demo.inputSource, 'uploaded');
  assert.equal(record.documents[0].name, document.name);
  assert.equal(record.selfie.name, 'selfie.png');
  assert.equal(record.riskScore, null);
  assert.equal(record.ocrResult, undefined);
});

test('simulated spoof or inconclusive liveness cannot produce a clear recommendation', async () => {
  for (const liveness of ['spoof', 'unknown']) {
    const { result } = await run('genuine-passport', liveness);
    assert.equal(result.faceResult.presentedFace.livenessStatus, liveness);
    assert.notEqual(result.riskResult.recommendation, 'clear');
    assert.ok(result.riskScore >= 43);
    assert.ok(result.evidence.some(item => item.title.includes('Liveness') && item.severity !== 'info'));
  }
});

test('officer decision is explicit, audited, and independent of the AI recommendation', async () => {
  const { result, repo } = await run('face-mismatch');
  assert.notEqual(result.riskResult.recommendation, 'clear');
  const reviewed = repo.reviewCase(result.id, { officer: ' Officer A ', decision: 'clear', notes: ' Manual inspection completed using demo evidence. ' });
  assert.equal(reviewed.officerReview.officer, 'Officer A');
  assert.equal(reviewed.officerReview.decision, 'clear');
  assert.equal(reviewed.riskResult.recommendation, result.riskResult.recommendation);
  assert.equal(repo.getSnapshot().listItems.find(item => item.id === result.id).status, 'closed');
  const event = repo.getSnapshot().auditEvents.at(-1);
  assert.equal(event.caseId, result.id);
  assert.equal(event.actorType, 'user');
  assert.equal(event.details.decision, 'clear');
  assert.throws(() => repo.reviewCase(result.id, { officer: 'Other', decision: 'refer', notes: 'Overwrite' }), /already/);
});

test('incomplete, unknown or unreasoned officer decisions are rejected', async () => {
  const { result, repo } = await run('genuine-passport');
  for (const input of [{ officer: '', decision: 'clear', notes: 'Reason' }, { officer: 'A', decision: 'clear', notes: ' ' }, { officer: 'A', decision: 'automatic', notes: 'Reason' }]) {
    assert.throws(() => repo.reviewCase(result.id, input));
  }
  assert.throws(() => repo.reviewCase('case-6', { officer: 'A', decision: 'clear', notes: 'Reason' }), /Complete/);
  assert.throws(() => repo.reviewCase('absent', { officer: 'A', decision: 'clear', notes: 'Reason' }), /Complete/);
});

test('JSON report is a case-specific snapshot with evidence and the human decision', async () => {
  const { result, repo } = await run('tampered-passport');
  const before = JSON.parse(repo.generateReport(result.id).content);
  assert.equal(before.officerDecision, null);
  assert.equal(before.reviewStatus, 'Awaiting officer review');
  repo.reviewCase(result.id, { officer: 'Officer B', decision: 'refer', notes: 'Photo substitution indicators require investigation.' });
  const report = repo.generateReport(result.id);
  const data = JSON.parse(report.content);
  assert.equal(report.caseId, result.id);
  assert.equal(report.format, 'json');
  assert.equal(data.caseId, result.id);
  assert.equal(data.governmentDatabaseAccess, false);
  assert.equal(data.demo, true);
  assert.equal(data.officerDecision.decision, 'refer');
  assert.deepEqual(data.evidence.map(item => item.id), result.evidence.map(item => item.id));
  assert.ok(data.audit.some(event => event.event === 'Officer review recorded'));
  assert.ok(data.audit.every(event => event.caseId === result.id));
  assert.equal(before.officerDecision, null);
  assert.equal(repo.getSnapshot().listItems.find(item => item.id === result.id).status, 'escalated');
  assert.throws(() => repo.generateReport('case-6'), /completed/);
});

