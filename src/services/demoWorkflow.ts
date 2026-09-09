import type { ScreeningCase, ValidationResult } from '../types/screening.ts';
import type { DocumentFile } from '../types/document.ts';
import type { EvidenceItem } from '../types/analysis.ts';
import type { StepOperation } from './screeningRun.ts';
import { createDemoCase } from '../mocks/screeningData.ts';
import { waitForStep, SkippedStep } from './screeningRun.ts';
import { withoutResults } from '../utils/screeningStatus.ts';

export function createDemoRun(scenarioId: string, documents: DocumentFile[] = [], selfie?: DocumentFile, liveness: 'live' | 'spoof' | 'unknown' = 'live'): ScreeningCase {
  const template = createDemoCase(scenarioId);
  if (documents.length && !selfie) throw new Error('Add a selfie for the uploaded document, or use a sample pair.');
  const identity = crypto.randomUUID();
  const now = new Date();
  return {
    ...withoutResults(template), id: 'case-' + identity,
    caseNumber: 'ID-' + now.getFullYear() + '-' + identity.toUpperCase(),
    createdAt: now, updatedAt: now, tags: ['demo', scenarioId], caseStatus: 'open',
    documents: (documents.length ? documents : template.documents).map((document, index) => ({ ...document, id: 'doc-' + identity + '-' + index })),
    selfie: selfie ?? { id: 'selfie-' + identity, name: 'Sample selfie — ' + template.subjectName, size: 0, type: 'image/jpeg', preview: '', documentType: 'other', uploadedAt: now },
    demo: { scenarioId, inputSource: documents.length ? 'uploaded' : 'sample', liveness },
  };
}

export function summarizeValidation(result: ValidationResult): ValidationResult {
  const count = (status: string) => result.checks.filter(check => check.status === status).length;
  return { ...result, passed: count('pass'), warnings: count('warning'), failed: count('fail'), notChecked: count('not_checked'),
    overallStatus: count('fail') ? 'fail' : count('warning') ? 'warning' : 'pass' };
}

export function generateEvidence(record: ScreeningCase): EvidenceItem[] {
  const evidence: EvidenceItem[] = [];
  const add = (type: EvidenceItem['type'], title: string, description: string, severity: EvidenceItem['severity'] = 'info') => {
    evidence.push({ id: record.id + '-evidence-' + evidence.length, type, title, description, severity, timestamp: new Date() });
  };
  if (record.ocrResult) add('ocr', 'Simulated OCR extraction', record.ocrResult.extractedFields.length + ' fields from the selected demo scenario; not extracted from uploaded pixels.');
  if (record.ocrResult?.mrz) add('mrz', 'Sample MRZ', [record.ocrResult.mrz.line1, record.ocrResult.mrz.line2].join('\n'));
  for (const check of record.validationResult?.checks ?? []) {
    if (check.status !== 'pass') add('validation', check.name + ' — ' + check.status.replaceAll('_', ' '), check.description, check.status === 'fail' ? 'critical' : check.status === 'warning' ? 'warning' : 'info');
  }
  for (const finding of record.tamperingResult?.findings ?? []) {
    if (finding.status !== 'clean') add('tampering', finding.name, finding.description, finding.status === 'tampered' ? 'critical' : 'warning');
  }
  if (record.faceResult) {
    add('face', 'Simulated face comparison — ' + record.faceResult.decision, record.faceResult.similarity + '% similarity; sample outcome, not a biometric measurement.', record.faceResult.decision === 'mismatch' ? 'critical' : 'info');
    const liveness = record.faceResult.presentedFace.livenessStatus;
    add('face', 'Liveness — ' + liveness.replaceAll('_', ' '), 'Selected demo liveness outcome. No live-camera anti-spoofing check was performed.', liveness === 'spoof' ? 'critical' : liveness === 'live' ? 'info' : 'warning');
  }
  return evidence;
}

export function demoStepOperation(delay = 500): StepOperation {
  return async (step, record, signal) => {
    await waitForStep(signal, delay);
    if (step === 'upload') return {};
    if (!record.demo) throw new SkippedStep('Real analysis is unavailable. Select a demo scenario to simulate this workflow.');
    const template = createDemoCase(record.demo.scenarioId);
    switch (step) {
      case 'extraction': return { ocrResult: template.ocrResult };
      case 'validation': return { validationResult: summarizeValidation(template.validationResult!) };
      case 'forensics': return { tamperingResult: template.tamperingResult };
      case 'face_verification': return { faceResult: { ...template.faceResult!, presentedFace: { ...template.faceResult!.presentedFace, livenessStatus: record.demo.liveness } } };
      case 'risk_assessment': {
        if (!record.ocrResult || !record.validationResult || !record.tamperingResult || !record.faceResult) throw new SkippedStep('Required screening evidence is missing.');
        const liveness = record.faceResult.presentedFace.livenessStatus;
        const score = Math.max(template.riskResult!.score, liveness === 'spoof' ? 91 : liveness !== 'live' ? 43 : 0);
        const level = score >= 70 ? 'high' : score >= 30 ? 'review' : 'low';
        return { riskResult: { ...template.riskResult!, score, level,
          recommendation: level === 'low' ? 'clear' : level === 'high' ? 'refer' : 'secondary_inspection',
          calculatedAt: new Date(),
          explanation: [...template.riskResult!.explanation, 'Liveness outcome is simulated: ' + liveness + '.', 'Government databases and watchlists were not accessed. Final decision belongs to the reviewing officer.'],
          contributors: [...template.riskResult!.contributors, ...(liveness === 'live' ? [] : [{ id: 'demo-liveness', factor: 'Liveness ' + liveness, description: 'Simulated liveness requires officer attention', impact: score - template.riskResult!.score, type: 'negative' as const, category: 'face' as const }])],
        } };
      }
      case 'result': return { evidence: generateEvidence(record) };
    }
  };
}

