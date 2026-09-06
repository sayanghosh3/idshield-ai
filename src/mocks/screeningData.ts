import { 
  ScreeningCase, 
  ScreeningStatus, 
  RiskLevel, 
  ScreeningStep,
  ValidationResult,
  ValidationCheck,
  TamperingResult,
  TamperingFinding,
  FaceVerificationResult,
  RiskResult,
  RiskContributor,
  ScreeningProgress
} from '../types';
import { demoDocuments, demoOCRResults } from './documents';

export const demoScenarios = [
  {
    id: 'genuine-passport',
    name: 'Scenario 1 — Genuine Passport',
    description: 'Valid passport with no anomalies detected',
    riskScore: 8,
    riskLevel: 'low' as RiskLevel,
    documentKey: 'genuine-passport',
  },
  {
    id: 'expired-passport',
    name: 'Scenario 2 — Expired Passport',
    description: 'Passport expired but otherwise valid',
    riskScore: 43,
    riskLevel: 'review' as RiskLevel,
    documentKey: 'expired-passport',
  },
  {
    id: 'tampered-passport',
    name: 'Scenario 3 — Tampered Passport',
    description: 'Passport with photo manipulation and text anomalies',
    riskScore: 82,
    riskLevel: 'high' as RiskLevel,
    documentKey: 'tampered-passport',
  },
  {
    id: 'face-mismatch',
    name: 'Scenario 4 — Face Mismatch',
    description: 'Document face does not match presented person',
    riskScore: 91,
    riskLevel: 'high' as RiskLevel,
    documentKey: 'face-mismatch',
  },
  {
    id: 'cross-mismatch',
    name: 'Scenario 5 — Cross-Document Mismatch',
    description: 'Visa passport number differs from passport record',
    riskScore: 74,
    riskLevel: 'high' as RiskLevel,
    documentKey: 'cross-mismatch',
  },
];

const createValidationResult = (scenarioId: string): ValidationResult => {
  const baseChecks: ValidationCheck[] = [
    { id: 'v1', category: 'Document Structure', name: 'Document format valid', description: 'File format matches expected document type', status: 'pass' },
    { id: 'v2', category: 'Document Structure', name: 'Required fields present', description: 'All mandatory fields detected in document', status: 'pass' },
    { id: 'v3', category: 'Field Format', name: 'Passport number format', description: 'Passport number follows ICAO format', status: 'pass' },
    { id: 'v4', category: 'Field Format', name: 'Date format consistency', description: 'All dates follow DD MMM YYYY format', status: 'pass' },
    { id: 'v5', category: 'MRZ', name: 'MRZ checksum validation', description: 'All MRZ check digits validate correctly', status: 'pass' },
    { id: 'v6', category: 'MRZ', name: 'MRZ character set', description: 'MRZ uses only valid ICAO characters', status: 'pass' },
    { id: 'v7', category: 'Dates', name: 'Date of birth validity', description: 'DOB is a valid past date', status: 'pass' },
    { id: 'v8', category: 'Dates', name: 'Expiry date validity', description: 'Expiry date is in the future', status: 'pass' },
    { id: 'v9', category: 'Cross-document Consistency', name: 'Internal data consistency', description: 'OCR and MRZ data match across fields', status: 'pass' },
    { id: 'v10', category: 'Expiry', name: 'Document not expired', description: 'Document expiry date is in the future', status: 'pass' },
    { id: 'v11', category: 'Watchlist', name: 'Watchlist check', description: 'Subject not found on sanctions/watchlists', status: 'not_checked' },
  ];

  switch (scenarioId) {
    case 'expired-passport':
      return {
        checks: baseChecks.map(c => c.id === 'v8' || c.id === 'v10' ? { ...c, status: 'fail' as const, description: c.description + ' — Document expired on 15 MAR 2020' } : c),
        passed: 7, warnings: 0, failed: 2, notChecked: 2, overallStatus: 'fail',
      };
    case 'tampered-passport':
      return {
        checks: baseChecks.map(c => {
          if (c.id === 'v9') return { ...c, status: 'fail' as const, description: 'OCR DOB (22 AUG 1990) does not match MRZ DOB (22 AUG 1990) — Visual anomaly detected' };
          if (c.id === 'v3') return { ...c, status: 'warning' as const, description: 'Passport number format valid but font anomalies detected' };
          return c;
        }),
        passed: 6, warnings: 1, failed: 1, notChecked: 2, overallStatus: 'fail',
      };
    case 'face-mismatch':
      return {
        checks: baseChecks.map(c => c),
        passed: 8, warnings: 0, failed: 0, notChecked: 2, overallStatus: 'pass',
      };
    case 'cross-mismatch':
      return {
        checks: baseChecks.map(c => {
          if (c.id === 'v9') return { ...c, status: 'fail' as const, description: 'Visa passport number (X9999999) does not match passport record (X1234567)' };
          return c;
        }),
        passed: 7, warnings: 0, failed: 1, notChecked: 2, overallStatus: 'fail',
      };
    default:
      return {
        checks: baseChecks,
        passed: 8, warnings: 0, failed: 0, notChecked: 2, overallStatus: 'pass',
      };
  }
};

const createTamperingResult = (scenarioId: string): TamperingResult => {
  const baseFindings: TamperingFinding[] = [
    { id: 't1', category: 'photo_integrity', name: 'Photo Integrity', description: 'Passport photograph analysis', score: 95, status: 'clean' },
    { id: 't2', category: 'text_integrity', name: 'Text Integrity', description: 'Printed text and font analysis', score: 93, status: 'clean' },
    { id: 't3', category: 'stamp_integrity', name: 'Stamp Integrity', description: 'Official stamps and seals verification', score: 91, status: 'clean' },
    { id: 't4', category: 'compression', name: 'Compression Analysis', description: 'JPEG compression consistency check', score: 88, status: 'clean' },
    { id: 't5', category: 'metadata', name: 'Metadata Consistency', description: 'EXIF and file metadata verification', score: 90, status: 'clean' },
    { id: 't6', category: 'overall', name: 'Overall Manipulation', description: 'Aggregate tampering probability', score: 92, status: 'clean' },
  ];

  switch (scenarioId) {
    case 'tampered-passport':
      return {
        findings: [
          { ...baseFindings[0], score: 63, status: 'suspicious', description: 'Possible photo substitution detected — Edge inconsistencies and lighting mismatch', region: { x: 0.15, y: 0.12, width: 0.28, height: 0.35 } },
          { ...baseFindings[1], score: 78, status: 'suspicious', description: 'Font anomalies in DOB field — Inconsistent kerning and baseline shift', region: { x: 0.55, y: 0.45, width: 0.30, height: 0.08 } },
          { ...baseFindings[2], score: 61, status: 'suspicious', description: 'Stamp pixelation inconsistent with surrounding areas', region: { x: 0.65, y: 0.70, width: 0.20, height: 0.15 } },
          { ...baseFindings[3], score: 72, status: 'suspicious', description: 'Double JPEG compression artifacts detected' },
          { ...baseFindings[4], score: 68, status: 'suspicious', description: 'EXIF creation date (2024) differs from document issue date (2018)' },
          { ...baseFindings[5], score: 68, status: 'suspicious', description: 'Multiple anomaly categories triggered' },
        ],
        overallScore: 68,
        overallStatus: 'suspicious',
        analysisTime: 3420,
        overlayImage: '/demo/tampered-overlay.jpg',
        heatmapImage: '/demo/tampered-heatmap.jpg',
      };
    case 'cross-mismatch':
      return {
        findings: [
          { ...baseFindings[0], score: 89, status: 'clean' },
          { ...baseFindings[1], score: 85, status: 'clean' },
          { ...baseFindings[2], score: 82, status: 'clean' },
          { ...baseFindings[3], score: 75, status: 'suspicious', description: 'Compression artifacts suggest document reassembly' },
          { ...baseFindings[4], score: 78, status: 'suspicious', description: 'Metadata indicates multiple edit sessions' },
          { ...baseFindings[5], score: 82, status: 'clean', description: 'No major visual tampering detected' },
        ],
        overallScore: 82,
        overallStatus: 'clean',
        analysisTime: 2890,
      };
    default:
      return {
        findings: baseFindings,
        overallScore: 92,
        overallStatus: 'clean',
        analysisTime: 2100,
      };
  }
};

const createFaceResult = (scenarioId: string): FaceVerificationResult => {
  const baseResult: FaceVerificationResult = {
    documentFace: { detected: true, boundingBox: { x: 0.15, y: 0.12, width: 0.28, height: 0.35 }, qualityScore: 92 },
    presentedFace: { detected: true, boundingBox: { x: 0.35, y: 0.10, width: 0.30, height: 0.38 }, qualityScore: 88, livenessStatus: 'backend_required' },
    similarity: 96.8,
    decision: 'match',
    threshold: 85,
    analysisTime: 1560,
  };

  switch (scenarioId) {
    case 'face-mismatch':
      return { ...baseResult, similarity: 42.3, decision: 'mismatch', presentedFace: { ...baseResult.presentedFace, qualityScore: 85 } };
    case 'tampered-passport':
      return { ...baseResult, similarity: 87.2, decision: 'match', documentFace: { ...baseResult.documentFace, qualityScore: 78 } };
    case 'cross-mismatch':
      return { ...baseResult, similarity: 94.1, decision: 'match' };
    default:
      return baseResult;
  }
};

const createRiskResult = (scenarioId: string, riskScore: number, riskLevel: RiskLevel): RiskResult => {
  const baseContributors: RiskContributor[] = [
    { id: 'r1', factor: 'Document validity', description: 'All validation checks passed', impact: -5, type: 'positive', category: 'document' },
    { id: 'r2', factor: 'Face verification', description: 'Face match confirmed', impact: -8, type: 'positive', category: 'face' },
    { id: 'r3', factor: 'MRZ consistency', description: 'OCR and MRZ data aligned', impact: -3, type: 'positive', category: 'document' },
  ];

  let contributors = [...baseContributors];
  let explanation = ['Document appears genuine with no anomalies detected.', 'All validation checks passed.', 'Face verification successful.'];
  let recommendation: RiskResult['recommendation'] = 'clear';

  switch (scenarioId) {
    case 'expired-passport':
      contributors = [
        { id: 'r1', factor: 'Document expired', description: 'Passport expired on 15 MAR 2020', impact: 35, type: 'negative', category: 'document' },
        { id: 'r2', factor: 'Face verification', description: 'Face match confirmed', impact: -8, type: 'positive', category: 'face' },
        { id: 'r3', factor: 'Other validations', description: 'All other checks passed', impact: -5, type: 'positive', category: 'document' },
      ];
      explanation = ['Passport expired on 15 MAR 2020 — over 5 years ago.', 'Face verification passed.', 'No tampering or forgery detected.'];
      recommendation = 'secondary_inspection';
      break;
    case 'tampered-passport':
      contributors = [
        { id: 'r1', factor: 'Possible photo manipulation', description: 'Edge inconsistencies and lighting mismatch in photo', impact: 35, type: 'negative', category: 'tampering' },
        { id: 'r2', factor: 'MRZ mismatch', description: 'OCR DOB does not match MRZ DOB', impact: 25, type: 'negative', category: 'document' },
        { id: 'r3', factor: 'Document inconsistency', description: 'Font anomalies and stamp irregularities', impact: 20, type: 'negative', category: 'tampering' },
        { id: 'r4', factor: 'Metadata anomaly', description: 'EXIF creation date differs from issue date', impact: 10, type: 'negative', category: 'tampering' },
        { id: 'r5', factor: 'Face match', description: 'Face verification passed', impact: -8, type: 'positive', category: 'face' },
      ];
      explanation = [
        'Passport photograph shows possible manipulation — edge inconsistencies and lighting mismatch detected.',
        'OCR Date of Birth (22 AUG 1990) does not match MRZ Date of Birth (22 AUG 1990) — visual anomaly in DOB field.',
        'Font anomalies detected in Date of Birth field — inconsistent kerning and baseline shift.',
        'Official stamp shows pixelation inconsistent with surrounding document areas.',
        'Metadata creation date (2024) conflicts with document issue date (2018).',
        'Face comparison passed with 87.2% similarity.',
      ];
      recommendation = 'secondary_inspection';
      break;
    case 'face-mismatch':
      contributors = [
        { id: 'r1', factor: 'Face mismatch', description: 'Document face does not match presented person', impact: 45, type: 'negative', category: 'face' },
        { id: 'r2', factor: 'Document validity', description: 'Passport appears genuine', impact: -5, type: 'positive', category: 'document' },
        { id: 'r3', factor: 'MRZ consistency', description: 'OCR and MRZ data aligned', impact: -3, type: 'positive', category: 'document' },
      ];
      explanation = [
        'Face comparison failed — similarity only 42.3% (threshold: 85%).',
        'Document face and presented person are different individuals.',
        'Passport document itself appears genuine with no tampering detected.',
        'Liveness verification requires backend integration.',
      ];
      recommendation = 'detain';
      break;
    case 'cross-mismatch':
      contributors = [
        { id: 'r1', factor: 'Cross-document mismatch', description: 'Visa passport number differs from passport record', impact: 30, type: 'negative', category: 'document' },
        { id: 'r2', factor: 'Metadata anomaly', description: 'Document shows signs of reassembly', impact: 15, type: 'negative', category: 'tampering' },
        { id: 'r3', factor: 'Face verification', description: 'Face match confirmed', impact: -8, type: 'positive', category: 'face' },
        { id: 'r4', factor: 'Document validity', description: 'Visa format and other fields valid', impact: -5, type: 'positive', category: 'document' },
      ];
      explanation = [
        'Visa passport number (X9999999) does not match the passport on record (X1234567).',
        'Compression analysis suggests document may have been reassembled.',
        'Metadata indicates multiple editing sessions.',
        'Face verification passed with 94.1% similarity.',
      ];
      recommendation = 'secondary_inspection';
      break;
    default:
      explanation = [
        'Document appears genuine with no anomalies detected.',
        'All validation checks passed.',
        'Face verification successful with high confidence.',
        'No tampering or forgery indicators found.',
      ];
      recommendation = 'clear';
  }

  return {
    score: riskScore,
    level: riskLevel,
    contributors,
    explanation,
    recommendation,
    calculatedAt: new Date(),
  };
};

export const createDemoCase = (scenarioId: string): ScreeningCase => {
  const scenario = demoScenarios.find(s => s.id === scenarioId)!;
  const document = demoDocuments[scenario.documentKey];
  const ocrResult = demoOCRResults[scenario.documentKey];
  const validationResult = createValidationResult(scenarioId);
  const tamperingResult = createTamperingResult(scenarioId);
  const faceResult = createFaceResult(scenarioId);
  const riskResult = createRiskResult(scenarioId, scenario.riskScore, scenario.riskLevel);

  return {
    id: `case-${scenarioId}-${Date.now()}`,
    caseNumber: `ID-2026-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    status: 'completed' as ScreeningStatus,
    riskLevel: scenario.riskLevel,
    riskScore: scenario.riskScore,
    documents: [document],
    ocrResult,
    validationResult,
    tamperingResult,
    faceResult,
    riskResult,
    currentStep: 'result' as ScreeningStep,
    createdAt: new Date(Date.now() - Math.random() * 86400000),
    updatedAt: new Date(),
    completedAt: new Date(),
    assignedOperator: 'Security Operator',
    tags: [scenarioId],
  };
};

export const mockScreeningCases: ScreeningCase[] = demoScenarios.map(s => createDemoCase(s.id));

export const mockScreeningProgress: ScreeningProgress[] = [
  { step: 'upload', progress: 100, message: 'Document uploaded successfully', startedAt: new Date(), completedAt: new Date() },
  { step: 'extraction', progress: 100, message: 'OCR extraction completed', startedAt: new Date(), completedAt: new Date() },
  { step: 'validation', progress: 100, message: 'Document validation completed', startedAt: new Date(), completedAt: new Date() },
  { step: 'forensics', progress: 100, message: 'Tampering analysis completed', startedAt: new Date(), completedAt: new Date() },
  { step: 'face_verification', progress: 100, message: 'Face verification completed', startedAt: new Date(), completedAt: new Date() },
  { step: 'risk_assessment', progress: 100, message: 'Risk score calculated', startedAt: new Date(), completedAt: new Date() },
  { step: 'result', progress: 100, message: 'Screening result generated', startedAt: new Date(), completedAt: new Date() },
];

export const screeningSteps: { step: ScreeningStep; label: string; number: string }[] = [
  { step: 'upload', label: 'Upload', number: '01' },
  { step: 'extraction', label: 'Extraction', number: '02' },
  { step: 'validation', label: 'Validation', number: '03' },
  { step: 'forensics', label: 'Forensics', number: '04' },
  { step: 'face_verification', label: 'Face Verification', number: '05' },
  { step: 'risk_assessment', label: 'Risk Assessment', number: '06' },
  { step: 'result', label: 'Result', number: '07' },
];