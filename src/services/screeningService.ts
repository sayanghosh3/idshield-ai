import { caseRepository } from './caseRepository';
import { hasCompleteResult, withoutResults } from '../utils/screeningStatus';
import {
  ScreeningCase,
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
  mockScreeningProgress,
  demoScenarios,
  screeningSteps
} from '../mocks';

const DEMO_MODE = import.meta.env.VITE_APP_ENV !== 'production';
const SIMULATED_DELAY = 800;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}


export const screeningService = {
  async createCase(documentIds: string[], documentType: string): Promise<ScreeningCase> {
    if (DEMO_MODE) {
      await delay(300);
      const scenarioId = documentIds[0]?.replace('doc-', '');
      if (!scenarioId) throw new Error('A demo document is required');
      const template = createDemoCase(scenarioId);
      const id = crypto.randomUUID();
      const record = { ...withoutResults(template), id: 'case-' + id, caseNumber: 'ID-' + new Date().getFullYear() + '-' + id.toUpperCase(), createdAt: new Date(), updatedAt: new Date() };
      caseRepository.upsert(record);
      return record;
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
      const existingCase = caseRepository.find(caseId);
      if (existingCase) return { ...existingCase };
      throw new Error('Case not found');
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
      let cases = [...caseRepository.getSnapshot().cases];

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
      const existingCase = caseRepository.find(caseId);
      if (existingCase && hasCompleteResult(existingCase)) return { ...existingCase };
      throw new Error('No completed screening is available for this case. Run screening from the screening page.');
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
      const existingCase = caseRepository.find(caseId);
      if (!existingCase?.documents.some(document => document.id === documentId)) throw new Error('Document does not belong to this case');
      if (!existingCase?.ocrResult) throw new Error('No ocrResult available for this case');
      return existingCase.ocrResult;
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
      const existingCase = caseRepository.find(caseId);
      if (!existingCase?.documents.some(document => document.id === documentId)) throw new Error('Document does not belong to this case');
      if (!existingCase?.validationResult) throw new Error('No validationResult available for this case');
      return existingCase.validationResult;
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
      const existingCase = caseRepository.find(caseId);
      if (!existingCase?.documents.some(document => document.id === documentId)) throw new Error('Document does not belong to this case');
      if (!existingCase?.tamperingResult) throw new Error('No tamperingResult available for this case');
      return existingCase.tamperingResult;
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
      const existingCase = caseRepository.find(caseId);
      if (!existingCase?.documents.some(document => document.id === documentId)) throw new Error('Document does not belong to this case');
      if (!existingCase?.faceResult) throw new Error('No faceResult available for this case');
      return existingCase.faceResult;
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
      const existingCase = caseRepository.find(caseId);
      if (!existingCase?.riskResult) throw new Error('No riskResult available for this case');
      return existingCase.riskResult;
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
