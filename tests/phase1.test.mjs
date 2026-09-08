import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createCaseRepository } from '../src/services/caseRepository.ts';
import { createDemoCase, demoScenarios } from '../src/mocks/screeningData.ts';
import { createScreeningRunner, SkippedStep, waitForStep } from '../src/services/screeningRun.ts';
import { STEP_ORDER, hasCompleteResult, initialStepStatuses, normalizeStepStatus, analysisStatuses, withoutResults } from '../src/utils/screeningStatus.ts';
import { formatScore, getRiskLevelLabel, getStatusColor } from '../src/utils/formatters.ts';

const template = createDemoCase('tampered-passport');
const field = { extraction: 'ocrResult', validation: 'validationResult', forensics: 'tamperingResult', face_verification: 'faceResult', risk_assessment: 'riskResult' };
const operation = async step => field[step] ? { [field[step]]: template[field[step]] } : {};
const fresh = () => ({ ...withoutResults(template), id: 'case-new', caseNumber: 'ID-NEW' });

test('all demo identities are stable and unique across repeated loads', () => {
  const first = demoScenarios.map(s => createDemoCase(s.id));
  const second = demoScenarios.map(s => createDemoCase(s.id));
  assert.deepEqual(first, second);
  assert.equal(new Set(first.map(c => c.id)).size, first.length);
  assert.equal(new Set(first.map(c => c.caseNumber)).size, first.length);
  assert.throws(() => createDemoCase('missing'), /Unknown scenario/);
});

test('case list and detail lookups share identity, subject, evidence, and risk', () => {
  const repo = createCaseRepository();
  for (const item of repo.getSnapshot().listItems) {
    const detail = repo.find(item.id);
    assert.equal(detail, repo.find(item.caseNumber));
    assert.equal(detail.subjectName, item.subjectName);
    assert.equal(detail.riskScore, item.riskScore);
    assert.equal(detail.riskLevel, item.riskLevel);
    if (detail.ocrResult) assert.equal(detail.subjectName, detail.ocrResult.extractedFields.find(f => f.key === 'fullName').value);
  }
  assert.equal(repo.find('case-1').subjectName, 'ALEX KUMAR');
  assert.equal(repo.find('case-2').subjectName, 'JOHN DOE');
  assert.equal(repo.find('unknown'), undefined);
  assert.equal(repo.find(undefined), undefined);
});

test('metadata-only cases remain visible but never inherit another case result', () => {
  const repo = createCaseRepository();
  for (let i = 6; i <= 12; i++) {
    const record = repo.find('case-' + i);
    assert.equal(record.riskScore, null);
    assert.equal(record.riskLevel, 'unknown');
    assert.equal(record.ocrResult, undefined);
    assert.equal(hasCompleteResult(record), false);
  }
  assert.equal(formatScore(null), 'Not assessed');
  assert.equal(getRiskLevelLabel('unknown'), 'NOT ASSESSED');
});

test('reports and audit events resolve to their actual case; orphan audit events are rejected', () => {
  const repo = createCaseRepository();
  for (const report of repo.getSnapshot().reports) {
    const record = repo.find(report.caseId);
    assert.ok(record);
    assert.ok(report.title.includes(record.caseNumber));
  }
  for (const event of repo.getSnapshot().auditEvents) assert.ok(repo.find(event.caseId));
  assert.throws(() => repo.addAudit({ caseId: 'unknown' }), /unknown case/);
});

test('repository publishes new runs to list consumers and rejects identity changes', () => {
  const repo = createCaseRepository();
  let calls = 0;
  const unsubscribe = repo.subscribe(() => calls++);
  const original = repo.getSnapshot();
  const record = fresh();
  repo.upsert(record);
  assert.notEqual(repo.getSnapshot(), original);
  assert.equal(repo.getSnapshot().listItems.find(c => c.id === record.id).caseNumber, record.caseNumber);
  assert.equal(calls, 1);
  assert.throws(() => repo.upsert({ ...record, caseNumber: 'CHANGED' }), /identity/);
  assert.throws(() => repo.upsert({ ...record, id: 'other' }), /Duplicate/);
  unsubscribe();
  repo.upsert(record);
  assert.equal(calls, 1);
});

test('screening completes each stage only after its operation resolves', async () => {
  const updates = [];
  const record = fresh();
  const result = await createScreeningRunner().run(record, async step => {
    const last = updates.at(-1);
    assert.equal(last.stepStatuses[step], 'processing');
    assert.equal(last.id, record.id);
    return { ...await operation(step), id: 'wrong-case', caseNumber: 'wrong-number' };
  }, update => updates.push(update));
  assert.equal(result.id, record.id);
  assert.equal(result.caseNumber, record.caseNumber);
  assert.equal(hasCompleteResult(result), true);
  assert.equal(result.riskScore, template.riskScore);
  for (const step of STEP_ORDER) {
    const states = updates.map(update => update.stepStatuses[step]);
    assert.ok(states.indexOf('processing') < states.indexOf('completed'));
    assert.equal(states.at(-1), 'completed');
  }
  for (const update of updates.filter(update => update.status !== 'completed')) assert.equal(update.riskScore, null);
});

for (const failedStep of STEP_ORDER) {
  test('failure at ' + failedStep + ' clears final risk and skips dependent stages', async () => {
    const updates = [];
    await assert.rejects(createScreeningRunner().run(fresh(), async step => {
      if (step === failedStep) throw new Error('Service failed');
      return operation(step);
    }, update => updates.push(update)), /Service failed/);
    const result = updates.at(-1);
    assert.equal(result.status, 'failed');
    assert.equal(result.stepStatuses[failedStep], 'failed');
    for (const step of STEP_ORDER.slice(STEP_ORDER.indexOf(failedStep) + 1)) assert.equal(result.stepStatuses[step], 'skipped');
    assert.equal(result.riskResult, undefined);
    assert.equal(result.riskScore, null);
    assert.equal(hasCompleteResult(result), false);
  });
}

test('missing or explicitly unavailable outputs are skipped, never successful', async () => {
  for (const missing of [true, false]) {
    const updates = [];
    await assert.rejects(createScreeningRunner().run(fresh(), async step => {
      if (step === 'extraction') {
        if (missing) return {};
        throw new SkippedStep('Backend unavailable');
      }
      return operation(step);
    }, update => updates.push(update)), SkippedStep);
    const result = updates.at(-1);
    assert.equal(result.status, 'incomplete');
    assert.equal(result.stepStatuses.upload, 'completed');
    for (const step of STEP_ORDER.slice(1)) assert.equal(result.stepStatuses[step], 'skipped');
    assert.equal(hasCompleteResult(result), false);
  }
});

test('cancellation commits incomplete state immediately and ignores late async responses', async () => {
  const runner = createScreeningRunner();
  const updates = [];
  let release;
  const pending = runner.run(fresh(), () => new Promise(resolve => { release = resolve; }), update => updates.push(update));
  runner.cancel();
  const count = updates.length;
  assert.equal(updates.at(-1).status, 'incomplete');
  assert.ok(Object.values(updates.at(-1).stepStatuses).every(s => s === 'skipped'));
  release({ riskResult: template.riskResult, id: 'wrong' });
  const result = await pending;
  assert.equal(updates.length, count);
  assert.equal(result.id, 'case-new');
  assert.equal(result.riskResult, undefined);
});

test('overlapping runs are rejected; a new run can start after cancellation settles', async () => {
  const runner = createScreeningRunner();
  let release;
  const pending = runner.run(fresh(), () => new Promise(resolve => { release = resolve; }), () => {});
  await assert.rejects(runner.run(fresh(), operation, () => {}), /already running/);
  runner.cancel();
  release({});
  await pending;
  const result = await runner.run(fresh(), operation, () => {});
  assert.equal(hasCompleteResult(result), true);
});

test('timer cancellation rejects immediately, including an already aborted signal', async () => {
  const controller = new AbortController();
  const pending = waitForStep(controller.signal, 10000);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  await assert.rejects(waitForStep(controller.signal, 10000), { name: 'AbortError' });
});

test('unsupported statuses fall back safely and missing/inconclusive face checks are not successes', () => {
  assert.deepEqual(Object.values(initialStepStatuses()), STEP_ORDER.map(() => 'pending'));
  for (const status of ['pending', 'processing', 'completed', 'failed', 'skipped']) assert.equal(normalizeStepStatus(status), status);
  for (const status of ['active', 'closed', 'passed', null, undefined, {}]) assert.equal(normalizeStepStatus(status), 'pending');
  const missing = analysisStatuses(fresh());
  assert.equal(missing.face, 'not_checked');
  assert.equal(missing.validation, 'not_checked');
  assert.equal(missing.tampering, 'not_checked');
  assert.equal(analysisStatuses({ ...template, faceResult: { ...template.faceResult, decision: 'inconclusive' } }).face, 'inconclusive');
  assert.notEqual(getStatusColor('bypassed'), getStatusColor('pass'));
});

test('a final result must contain all evidence and a matching finite risk score', () => {
  assert.equal(hasCompleteResult(template), true);
  for (const key of ['ocrResult', 'validationResult', 'tamperingResult', 'faceResult', 'riskResult']) assert.equal(hasCompleteResult({ ...template, [key]: undefined }), false);
  for (const score of [null, NaN, Infinity, -1, 101]) assert.equal(hasCompleteResult({ ...template, riskScore: score }), false);
  assert.equal(hasCompleteResult({ ...template, stepStatuses: { ...template.stepStatuses, validation: 'skipped' } }), false);
});

test('invalid risk output fails without presenting a successful final step', async () => {
  const updates = [];
  await assert.rejects(createScreeningRunner().run(fresh(), async step => {
    if (step === 'risk_assessment') return { riskResult: { ...template.riskResult, score: NaN } };
    return operation(step);
  }, update => updates.push(update)), /Invalid final risk result/);
  const result = updates.at(-1);
  assert.equal(result.status, 'failed');
  assert.equal(result.stepStatuses.result, 'failed');
  assert.equal(result.riskResult, undefined);
});

test('a step cannot prepopulate another step with unrelated evidence', async () => {
  const updates = [];
  await assert.rejects(createScreeningRunner().run(fresh(), async step => {
    if (step === 'upload') return { ocrResult: template.ocrResult, faceResult: template.faceResult };
    throw new Error('Unavailable');
  }, update => updates.push(update)));
  assert.equal(updates.at(-1).ocrResult, undefined);
  assert.equal(updates.at(-1).faceResult, undefined);
});

test('case screens subscribe to shared records and app navigation does not reload the page', () => {
  for (const page of ['Dashboard', 'Cases', 'RiskCases', 'CaseDetails', 'ScreeningResult', 'Reports', 'AuditLog']) {
    const source = readFileSync(new URL('../src/pages/' + page + '.tsx', import.meta.url), 'utf8');
    assert.match(source, /useCases\(\)/, page + ' must read the shared case snapshot');
    assert.doesNotMatch(source, /\|\|\s*mockScreeningCases\[0\]/, page + ' must not substitute another case');
  }
  for (const file of readdirSync(new URL('../src', import.meta.url), { recursive: true })) {
    if (!/\.(tsx?|jsx?)$/.test(file)) continue;
    const source = readFileSync(new URL('../src/' + file.replaceAll('\\', '/'), import.meta.url), 'utf8');
    assert.doesNotMatch(source, /window\.location\.href\s*=/, file);
  }
});
