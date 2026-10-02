import test from 'node:test';
import assert from 'node:assert/strict';
import { liveStepOperation, extractedSubjectName } from '../src/services/liveWorkflow.ts';
import { createScreeningRunner } from '../src/services/screeningRun.ts';
import { createCaseRepository } from '../src/services/caseRepository.ts';
import { initialStepStatuses, hasCompleteResult } from '../src/utils/screeningStatus.ts';

const now = new Date();
const document = { id: 'synthetic-upload', name: 'synthetic.png', type: 'image/png', size: 10, preview: '', documentType: 'passport', uploadedAt: now };
const record = () => ({ id: crypto.randomUUID(), caseNumber: crypto.randomUUID(), tags: ['real-analysis'], documents: [], selfie: { ...document, id: 'selfie' }, status: 'draft', riskScore: null, riskLevel: 'unknown', currentStep: 'upload', stepStatuses: initialStepStatuses(), createdAt: now, updatedAt: now });
const raw = { tamperingScore: 65, verdict: 'medium', processingTime: 0.2, analysisId: 'synthetic-forensics', method: 'test-fixture', findings: [{ id: 'signal', title: 'Noise variation', category: 'noise', severity: 'medium', description: 'Synthetic signal' }], signals: {}, quality: {}, metadata: {} };
const operations = () => ({
  upload: async () => [document],
  ocr: async id => { assert.equal(id, document.id); return { extractedFields: [{ key: 'fullName', value: 'SYNTHETIC EXAMPLE' }], overallConfidence: 80 }; },
  validate: async () => ({ checks: [{ id: 'v', status: 'warning', name: 'Synthetic check', description: 'Review needed' }], overallStatus: 'warning' }),
  forensics: async () => raw,
  face: async () => ({ documentFace: { detected: true, qualityScore: 100 }, presentedFace: { detected: true, qualityScore: 100, livenessStatus: 'not_checked' }, decision: 'mismatch', similarity: 12, threshold: 0.68, distance: 0.8, model: 'ArcFace', detector: 'opencv', processingTime: 1 }),
  risk: async data => { assert.equal(data.faceResult.presentedFace.livenessStatus, 'not_checked'); return { score: 80, level: 'high', recommendation: 'manual_review', contributors: [{ id: 'face-mismatch', type: 'negative', impact: 35, factor: 'Face mismatch', description: 'Synthetic mismatch' }], explanation: ['Synthetic fixture risk'], analysisId: 'test-risk', method: 'test-fixture' }; },
});

test('live outputs survive navigation through the shared repository, evidence, review and report', async () => {
  const repo = createCaseRepository();
  const completed = await createScreeningRunner().run(record(), liveStepOperation(operations()), update => repo.upsert(update));
  const saved = repo.find(completed.id);
  assert.ok(hasCompleteResult(saved));
  assert.ok(repo.getSnapshot().listItems.some(item => item.id === saved.id && item.riskScore === 80));
  assert.equal(repo.find(saved.caseNumber), saved);
  assert.deepEqual(saved.tamperingResult.raw, raw);
  assert.equal(saved.tamperingResult.findings[0].score, undefined, 'do not invent numeric severity scores');
  assert.equal(saved.validationResult.warnings, 1);
  assert.equal(saved.faceResult.model, 'ArcFace');
  assert.equal(saved.riskResult.contributors[0].impact, 35);
  assert.ok(saved.evidence.every(item => item.id.startsWith(saved.id)));
  assert.ok(saved.evidence.some(item => item.title === 'Live OCR extraction'));
  assert.ok(saved.evidence.some(item => item.description.includes('LIVENESS NOT CHECKED')));
  repo.reviewCase(saved.id, { officer: 'Synthetic Reviewer', notes: 'Synthetic evidence reviewed', decision: 'refer' });
  assert.throws(() => repo.reviewCase(saved.id, { officer: 'Other', notes: 'Change', decision: 'clear' }), /already/);
  const audit = repo.getSnapshot().auditEvents.filter(item => item.caseId === saved.id);
  assert.equal(audit.length, 1);
  assert.equal(audit[0].details.simulated, false);
  assert.equal(audit[0].details.notes, undefined, 'do not duplicate review notes into audit');
  const report = JSON.parse(repo.generateReport(saved.id).content);
  assert.equal(report.demo, false);
  assert.equal(report.simulation, null);
  assert.equal(report.officerDecision.decision, 'refer');
});

for (const failed of ['upload', 'ocr', 'validate', 'forensics', 'face', 'risk']) {
  test(`live ${failed} failure cannot silently become a demo or completed result`, async () => {
    const repo = createCaseRepository(); const input = record(); const ops = operations();
    ops[failed] = async () => { throw new Error('Backend unavailable'); };
    await assert.rejects(createScreeningRunner().run(input, liveStepOperation(ops), update => repo.upsert(update)), /Backend unavailable/);
    const saved = repo.find(input.id);
    assert.equal(saved.status, 'failed');
    assert.equal(saved.riskScore, null);
    assert.equal(saved.demo, undefined);
    assert.equal(hasCompleteResult(saved), false);
    if (failed === 'face') assert.ok(saved.ocrResult && saved.validationResult && saved.tamperingResult);
    assert.throws(() => repo.reviewCase(input.id, { officer: 'Synthetic', notes: 'Test', decision: 'clear' }), /Complete/);
  });
}

test('OCR names support actual passport and national ID response keys', () => {
  assert.equal(extractedSubjectName({ extractedFields: [{key:'surname', value:'EXAMPLE'}, {key:'given_name', value:'SYNTHETIC'}] }), 'SYNTHETIC EXAMPLE');
  assert.equal(extractedSubjectName({ extractedFields: [{key:'name', value:'SYNTHETIC EXAMPLE'}] }), 'SYNTHETIC EXAMPLE');
  assert.equal(extractedSubjectName(), 'Not extracted');
});
