import { 
  ValidationResult, 
  TamperingResult, 
  FaceVerificationResult, 
  RiskResult 
} from './screening';
import { DocumentFile, OCRResult } from './document';

export interface DocumentAnalysis {
  documentType: string;
  extractedFields: Record<string, string>;
  ocrConfidence: number;
  validation: ValidationResult;
  tampering: TamperingResult;
  faceVerification?: FaceVerificationResult;
  risk: RiskResult;
}

export interface EvidenceItem {
  id: string;
  type: 'ocr' | 'validation' | 'tampering' | 'face' | 'metadata' | 'mrz';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  relatedFindingId?: string;
  documentRegion?: {
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  timestamp: Date;
}

export interface AnalysisReport {
  caseId: string;
  generatedAt: Date;
  generatedBy: string;
  documentInfo: {
    type: string;
    fileName: string;
    fileSize: number;
  };
  extractedFields: Record<string, { value: string; confidence: number }>;
  validationSummary: {
    total: number;
    passed: number;
    warnings: number;
    failed: number;
  };
  tamperingSummary: {
    overallScore: number;
    status: string;
    findingsCount: number;
  };
  faceVerificationSummary: {
    similarity: number;
    decision: string;
    liveness: string;
  };
  riskAssessment: {
    score: number;
    level: string;
    recommendation: string;
  };
  findings: EvidenceItem[];
  conclusion: string;
}