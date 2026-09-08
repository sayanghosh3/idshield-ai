import type { DocumentType, DocumentFile, OCRResult } from './document';

export type ScreeningStatus =
  | 'draft'
  | 'uploading'
  | 'processing'
  | 'ocr'
  | 'validation'
  | 'tampering'
  | 'face_verification'
  | 'risk_assessment'
  | 'completed'
  | 'failed'
  | 'incomplete';

export type RiskLevel = 'low' | 'review' | 'high' | 'unknown';
export type StepStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';

export type ScreeningStep =
  | 'upload'
  | 'extraction'
  | 'validation'
  | 'forensics'
  | 'face_verification'
  | 'risk_assessment'
  | 'result';

export interface ValidationCheck {
  id: string;
  category: string;
  name: string;
  description: string;
  status: 'pass' | 'warning' | 'fail' | 'not_checked';
  details?: string;
}

export interface ValidationResult {
  checks: ValidationCheck[];
  passed: number;
  warnings: number;
  failed: number;
  notChecked: number;
  overallStatus: 'pass' | 'warning' | 'fail';
}

export interface TamperingFinding {
  id: string;
  category: 'photo_integrity' | 'text_integrity' | 'stamp_integrity' | 'compression' | 'metadata' | 'overall';
  name: string;
  description: string;
  score: number;
  status: 'clean' | 'suspicious' | 'tampered';
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  details?: string;
}

export interface TamperingResult {
  findings: TamperingFinding[];
  overallScore: number;
  overallStatus: 'clean' | 'suspicious' | 'tampered';
  analysisTime: number;
  overlayImage?: string;
  heatmapImage?: string;
}

export interface FaceVerificationResult {
  documentFace: {
    detected: boolean;
    boundingBox?: { x: number; y: number; width: number; height: number };
    qualityScore: number;
  };
  presentedFace: {
    detected: boolean;
    boundingBox?: { x: number; y: number; width: number; height: number };
    qualityScore: number;
    livenessStatus: 'live' | 'spoof' | 'unknown' | 'backend_required';
  };
  similarity: number;
  decision: 'match' | 'mismatch' | 'inconclusive';
  threshold: number;
  analysisTime: number;
}

export interface RiskContributor {
  id: string;
  factor: string;
  description: string;
  impact: number;
  type: 'positive' | 'negative';
  category: 'tampering' | 'validation' | 'face' | 'document' | 'database' | 'behavioral';
}

export interface RiskResult {
  score: number;
  level: RiskLevel;
  contributors: RiskContributor[];
  explanation: string[];
  recommendation: 'clear' | 'secondary_inspection' | 'detain' | 'refer';
  calculatedAt: Date;
}

export interface ScreeningCase {
  id: string;
  caseNumber: string;
  status: ScreeningStatus;
  riskLevel: RiskLevel;
  riskScore: number | null;
  subjectName?: string;
  documentType?: string;
  stepStatuses?: Record<ScreeningStep, StepStatus>;
  documents: DocumentFile[];
  ocrResult?: OCRResult;
  validationResult?: ValidationResult;
  tamperingResult?: TamperingResult;
  faceResult?: FaceVerificationResult;
  riskResult?: RiskResult;
  currentStep: ScreeningStep;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  assignedOperator?: string;
  tags: string[];
}

export interface ScreeningProgress {
  step: ScreeningStep;
  progress: number;
  message: string;
  startedAt: Date;
  completedAt?: Date;
}
