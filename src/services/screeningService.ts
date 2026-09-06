import { 
  ScreeningCase, 
  ScreeningStep, 
  ScreeningStatus, 
  RiskLevel,
  ValidationResult,
  TamperingResult,
  FaceVerificationResult,
  RiskResult,
  OCRResult,
  ScreeningProgress
} from '../types';
import { apiRequest, API_ENDPOINTS } from './api';
import { 
  createDemoCase, 
  mockScreeningCases, 
  mockScreeningProgress,
  demoScenarios,
  screeningSteps 
} from '../mocks';
import { demoOCRResults } from '../mocks/documents';

const DEMO_MODE = import.meta.env.VITE_APP_ENV !== 'production';
const SIMULATED_DELAY = 800;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function simulateProgress(
  steps: ScreeningStep[],
  onProgress: (progress: ScreeningProgress) => void
): Promise<void> {
  for (const step of steps) {
    await delay(SIMULATED_DELAY);
    onProgress({
      step,
      progress: 100,
      message: `${step.charAt(0).toUpperCase() + step.slice(1).replace('_', ' ')} completed`,
      startedAt: new Date(),
      completedAt: new Date(),
    });
  }
}

export const screeningService = {
  async createCase(documentIds: string[], documentType: string): Promise<ScreeningCase> {
    if (DEMO_MODE) {
      await delay(300);
      const scenarioId = documentIds[0]?.replace('doc-', '') || 'genuine-passport';
      return createDemoCase(scenarioId);
    }

    const response = await apiRequest<ScreeningCase>(API_ENDPOINTS.screenings, {
      method: 'POST',
      body: JSON.stringify({ documentIds, documentType }),
    });
    return response.data;
  },

  async getCase(caseId: string): Promise<ScreeningCase> {
    if (DEMO_MODE) {
      await delay(200);
      const existingCase = mockScreeningCases.find(c => c.id === caseId || c.caseNumber === caseId);
      if (existingCase) return { ...existingCase };
      return createDemoCase('genuine-passport');
    }

    const response = await apiRequest<ScreeningCase>(`${API_ENDPOINTS.screenings}/${caseId}`);
    return response.data;
  },

  async listCases(params?: {
    page?: number;
    pageSize?: number;
    status?: ScreeningStatus;
    riskLevel?: RiskLevel;
    search?: string;
  }): Promise<{ cases: ScreeningCase[]; total: number }> {
    if (DEMO_MODE) {
      await delay(200);
      let cases = [...mockScreeningCases];
      
      if (params?.search) {
        const query = params.search.toLowerCase();
        cases = cases.filter(c => 
          c.caseNumber.toLowerCase().includes(query) ||
          c.documents.some(d => d.name.toLowerCase().includes(query)) ||
          c.assignedOperator?.toLowerCase().includes(query)
        );
      }
      
      if (params?.riskLevel) {
        cases = cases.filter(c => c.riskLevel === params.riskLevel);
      }
      
      if (params?.status) {
        cases = cases.filter(c => c.status === params.status);
      }

      const page = params?.page || 1;
      const pageSize = params?.pageSize || 20;
      const start = (page - 1) * pageSize;
      
      return {
        cases: cases.slice(start, start + pageSize),
        total: cases.length,
      };
    }

    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.pageSize) queryParams.set('pageSize', String(params.pageSize));
    if (params?.status) queryParams.set('status', params.status);
    if (params?.riskLevel) queryParams.set('riskLevel', params.riskLevel);
    if (params?.search) queryParams.set('search', params.search);

    const response = await apiRequest<{ cases: ScreeningCase[]; total: number }>(
      `${API_ENDPOINTS.screenings}?${queryParams.toString()}`
    );
    return response.data;
  },

  async runScreening(
    caseId: string,
    onProgress: (progress: ScreeningProgress) => void
  ): Promise<ScreeningCase> {
    if (DEMO_MODE) {
      await simulateProgress(screeningSteps.map(s => s.step), onProgress);
      const existingCase = mockScreeningCases.find(c => c.id === caseId || c.caseNumber === caseId);
      if (existingCase) return { ...existingCase, status: 'completed' };
      return createDemoCase('genuine-passport');
    }

    const response = await apiRequest<ScreeningCase>(
      `${API_ENDPOINTS.screenings}/${caseId}/run`,
      { method: 'POST' }
    );
    return response.data;
  },

  async extractOCR(caseId: string, documentId: string): Promise<OCRResult> {
    if (DEMO_MODE) {
      await delay(SIMULATED_DELAY);
      const existingCase = mockScreeningCases.find(c => c.id === caseId);
      return existingCase?.ocrResult || demoOCRResults['genuine-passport'];
    }

    const response = await apiRequest<OCRResult>(`${API_ENDPOINTS.ocr}`, {
      method: 'POST',
      body: JSON.stringify({ caseId, documentId }),
    });
    return response.data;
  },

  async validateDocument(caseId: string, documentId: string): Promise<ValidationResult> {
    if (DEMO_MODE) {
      await delay(SIMULATED_DELAY);
      const existingCase = mockScreeningCases.find(c => c.id === caseId);
      return existingCase?.validationResult || createValidationResult('genuine-passport');
    }

    const response = await apiRequest<ValidationResult>(`${API_ENDPOINTS.validation}`, {
      method: 'POST',
      body: JSON.stringify({ caseId, documentId }),
    });
    return response.data;
  },

  async analyzeTampering(caseId: string, documentId: string): Promise<TamperingResult> {
    if (DEMO_MODE) {
      await delay(SIMULATED_DELAY * 2);
      const existingCase = mockScreeningCases.find(c => c.id === caseId);
      return existingCase?.tamperingResult || createTamperingResult('genuine-passport');
    }

    const response = await apiRequest<TamperingResult>(`${API_ENDPOINTS.tampering}`, {
      method: 'POST',
      body: JSON.stringify({ caseId, documentId }),
    });
    return response.data;
  },

  async verifyFace(caseId: string, documentId: string, presentedImageId?: string): Promise<FaceVerificationResult> {
    if (DEMO_MODE) {
      await delay(SIMULATED_DELAY * 2);
      const existingCase = mockScreeningCases.find(c => c.id === caseId);
      return existingCase?.faceResult || createFaceResult('genuine-passport');
    }

    const response = await apiRequest<FaceVerificationResult>(`${API_ENDPOINTS.face}`, {
      method: 'POST',
      body: JSON.stringify({ caseId, documentId, presentedImageId }),
    });
    return response.data;
  },

  async calculateRisk(caseId: string): Promise<RiskResult> {
    if (DEMO_MODE) {
      await delay(SIMULATED_DELAY);
      const existingCase = mockScreeningCases.find(c => c.id === caseId);
      return existingCase?.riskResult || createRiskResult('genuine-passport', 8, 'low');
    }

    const response = await apiRequest<RiskResult>(`${API_ENDPOINTS.risk}`, {
      method: 'POST',
      body: JSON.stringify({ caseId }),
    });
    return response.data;
  },

  async uploadDocument(file: File, onProgress?: (progress: number) => void): Promise<{ fileId: string; preview: string }> {
    if (DEMO_MODE) {
      await delay(500);
      const preview = URL.createObjectURL(file);
      return { fileId: `doc-${Date.now()}`, preview };
    }

    const response = await apiRequest<{ fileId: string; preview: string }>(
      API_ENDPOINTS.documents,
      { method: 'POST', body: file }
    );
    return response.data;
  },

  getScreeningSteps() {
    return screeningSteps;
  },

  getDemoScenarios() {
    return demoScenarios;
  },

  getMockProgress() {
    return mockScreeningProgress;
  },
};

function createValidationResult(scenarioId: string): ValidationResult {
  return mockScreeningCases.find(c => c.tags.includes(scenarioId))?.validationResult || {
    checks: [],
    passed: 0,
    warnings: 0,
    failed: 0,
    notChecked: 0,
    overallStatus: 'pass',
  };
}

function createTamperingResult(scenarioId: string): TamperingResult {
  return mockScreeningCases.find(c => c.tags.includes(scenarioId))?.tamperingResult || {
    findings: [],
    overallScore: 90,
    overallStatus: 'clean',
    analysisTime: 2000,
  };
}

function createFaceResult(scenarioId: string): FaceVerificationResult {
  return mockScreeningCases.find(c => c.tags.includes(scenarioId))?.faceResult || {
    documentFace: { detected: true, qualityScore: 90 },
    presentedFace: { detected: true, qualityScore: 85, livenessStatus: 'backend_required' },
    similarity: 95,
    decision: 'match',
    threshold: 85,
    analysisTime: 1500,
  };
}

function createRiskResult(scenarioId: string, score: number, level: RiskLevel): RiskResult {
  return mockScreeningCases.find(c => c.tags.includes(scenarioId))?.riskResult || {
    score,
    level,
    contributors: [],
    explanation: [],
    recommendation: 'clear',
    calculatedAt: new Date(),
  };
}