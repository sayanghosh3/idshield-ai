import type { ScreeningCase, RiskResult, TamperingResult } from '../types/screening.ts';
import type { DocumentFile, OCRResult } from '../types/document.ts';
import type { TamperingResult as BackendForensics } from './documentService.ts';
import type { FaceVerificationResult as BackendFace } from './faceService.ts';
import type { StepOperation } from './screeningRun.ts';
import { generateEvidence, summarizeValidation } from './demoWorkflow.ts';

export interface LiveRisk extends Omit<RiskResult, 'calculatedAt' | 'contributors'> {
  contributors: Array<Omit<RiskResult['contributors'][number], 'category'>>;
  analysisId: string;
  method: string;
}

export function normalizeForensics(result: BackendForensics): TamperingResult {
  return {
    overallScore: result.tamperingScore,
    overallStatus: result.verdict === 'low' ? 'clean' : result.verdict === 'medium' ? 'suspicious' : 'tampered',
    analysisTime: result.processingTime,
    raw: result,
    findings: result.findings.map(finding => ({
      id: finding.id, name: finding.title, description: finding.description,
      category: 'overall',
      status: finding.severity === 'info' ? 'clean' : ['high', 'critical'].includes(finding.severity) ? 'tampered' : 'suspicious',
    })),
  };
}

export interface LiveOperations {
  upload: () => Promise<DocumentFile[]>;
  ocr: (documentId: string) => Promise<OCRResult>;
  validate: (ocr: OCRResult) => Promise<NonNullable<ScreeningCase['validationResult']>>;
  forensics: () => Promise<BackendForensics>;
  face: () => Promise<BackendFace>;
  risk: (record: ScreeningCase) => Promise<LiveRisk>;
}

// Use the same runner and repository as demo cases, including partial results on failure.
export function liveStepOperation(operations: LiveOperations): StepOperation {
  return async (step, record, signal) => {
    signal.throwIfAborted();
    switch (step) {
      case 'upload': {
        const documents = await operations.upload();
        if (documents.length !== 1) throw new Error('Live screening requires exactly one document.');
        return { documents };
      }
      case 'extraction': return { ocrResult: await operations.ocr(record.documents[0].id) };
      case 'validation': return { validationResult: summarizeValidation(await operations.validate(record.ocrResult!)) };
      case 'forensics': return { tamperingResult: normalizeForensics(await operations.forensics()) };
      case 'face_verification': {
        const face = await operations.face();
        return { faceResult: { ...face, analysisTime: face.processingTime } };
      }
      case 'risk_assessment': {
        const risk = await operations.risk(record);
        return { riskResult: { ...risk, calculatedAt: new Date(), contributors: risk.contributors.map(item => ({
          ...item, category: item.id.startsWith('face') ? 'face' : item.id.startsWith('tampering') ? 'tampering' : item.id.startsWith('ocr') ? 'document' : 'validation',
        })) } };
      }
      case 'result': return { evidence: generateEvidence(record) };
    }
  };
}

export function extractedSubjectName(ocr?: OCRResult): string {
  const fields = new Map(ocr?.extractedFields.map(field => [field.key, field.value.trim()]) ?? []);
  return fields.get('fullName') || fields.get('name') || [fields.get('given_name'), fields.get('surname')].filter(Boolean).join(' ') || 'Not extracted';
}
