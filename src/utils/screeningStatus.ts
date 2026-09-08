import type { ScreeningCase, ScreeningStep, StepStatus, FaceVerificationResult } from '../types/screening.ts';
export const STEP_ORDER: readonly ScreeningStep[] = ['upload', 'extraction', 'validation', 'forensics', 'face_verification', 'risk_assessment', 'result'];
export function initialStepStatuses(): Record<ScreeningStep, StepStatus> {
  return Object.fromEntries(STEP_ORDER.map(step => [step, 'pending'])) as Record<ScreeningStep, StepStatus>;
}
export function normalizeStepStatus(value: unknown): StepStatus {
  return ['pending', 'processing', 'completed', 'failed', 'skipped'].includes(String(value)) ? value as StepStatus : 'pending';
}
export function caseWorkflowStatus(value: unknown): StepStatus {
  switch (value) { case 'closed': case 'archived': return 'completed'; case 'under_review': return 'processing'; default: return 'pending'; }
}
export function faceOutcome(face?: FaceVerificationResult | null): 'pass' | 'fail' | 'inconclusive' | 'not_checked' {
  if (!face) return 'not_checked';
  if (face.decision === 'match') return 'pass';
  if (face.decision === 'mismatch') return 'fail';
  return 'inconclusive';
}
export function analysisStatuses(record: ScreeningCase) {
  return {
    ocr: record.ocrResult ? 'completed' : 'not_checked',
    validation: record.validationResult?.overallStatus ?? 'not_checked',
    tampering: record.tamperingResult?.overallStatus === 'clean' ? 'pass' : record.tamperingResult?.overallStatus === 'suspicious' ? 'warning' : record.tamperingResult?.overallStatus === 'tampered' ? 'fail' : 'not_checked',
    face: faceOutcome(record.faceResult),
  };
}
export function hasCompleteResult(record: ScreeningCase): boolean {
  return record.status === 'completed' && !!record.ocrResult && !!record.validationResult &&
    !!record.tamperingResult && !!record.faceResult && !!record.riskResult &&
    Number.isFinite(record.riskScore) && record.riskScore === record.riskResult.score &&
    record.riskScore! >= 0 && record.riskScore! <= 100 &&
    ['low', 'review', 'high'].includes(record.riskLevel) && record.riskLevel === record.riskResult.level &&
    STEP_ORDER.every(step => record.stepStatuses?.[step] === 'completed');
}
export function withoutResults(record: ScreeningCase): ScreeningCase {
  return { ...record, status: 'draft', riskLevel: 'unknown', riskScore: null, ocrResult: undefined, validationResult: undefined, tamperingResult: undefined, faceResult: undefined, riskResult: undefined, completedAt: undefined, currentStep: 'upload', stepStatuses: initialStepStatuses() };
}

