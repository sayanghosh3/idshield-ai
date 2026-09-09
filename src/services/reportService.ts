import { caseRepository } from './caseRepository';
import { hasCompleteResult } from '../utils/screeningStatus';
import { Report, AnalysisReport } from '../types';
import { apiRequest, API_ENDPOINTS } from './api';

const DEMO_MODE = import.meta.env.VITE_APP_ENV !== 'production';

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const reportService = {
  async generateReport(caseId: string, type: Report['type'] = 'screening', format: Report['format'] = 'pdf'): Promise<Report> {
    if (DEMO_MODE) {
      if (format !== 'json') throw new Error('Demo reports support JSON export only.');
      return caseRepository.generateReport(caseId, type);
    }

    const response = await apiRequest<Report>(API_ENDPOINTS.reports, {
      method: 'POST',
      body: JSON.stringify({ caseId, type, format }),
    });
    return response.data;
  },

  async getReport(reportId: string): Promise<Report> {
    if (DEMO_MODE) {
      await delay(200);
      const report = caseRepository.getSnapshot().reports.find(report => report.id === reportId);
      if (!report) throw new Error('Report not found');
      return report;
    }

    const response = await apiRequest<Report>(`${API_ENDPOINTS.reports}/${reportId}`);
    return response.data;
  },

  async listReports(caseId: string): Promise<Report[]> {
    if (DEMO_MODE) {
      await delay(200);
      const record = caseRepository.find(caseId);
      if (!record) throw new Error('Case not found');
      return caseRepository.getSnapshot().reports.filter(report => report.caseId === record.id);
    }

    const response = await apiRequest<Report[]>(`${API_ENDPOINTS.reports}?caseId=${caseId}`);
    return response.data;
  },

  async downloadReport(reportId: string): Promise<Blob> {
    if (DEMO_MODE) {
      await delay(500);
      const report = caseRepository.getSnapshot().reports.find(item => item.id === reportId);
      if (!report?.content) throw new Error('This sample report has no downloadable file. Generate a JSON report instead.');
      return new Blob([report.content], { type: 'application/json' });
    }

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${API_ENDPOINTS.reports}/${reportId}/download`);
    return response.blob();
  },

  async previewReport(caseId: string): Promise<AnalysisReport> {
    if (DEMO_MODE) {
      await delay(500);
      const record = caseRepository.find(caseId);
      if (!record || !hasCompleteResult(record)) throw new Error('No completed result available for this case');
      const { documents, ocrResult, validationResult, tamperingResult, faceResult, riskResult } = record;
      return {
        caseId: record.id, generatedAt: new Date(), generatedBy: 'Security Operator',
        documentInfo: { type: documents[0]?.documentType ?? 'Unknown', fileName: documents[0]?.name ?? '', fileSize: documents[0]?.size ?? 0 },
        extractedFields: Object.fromEntries(ocrResult!.extractedFields.map(field => [field.label, { value: field.value, confidence: field.confidence }])),
        validationSummary: { total: validationResult!.checks.length, passed: validationResult!.passed, warnings: validationResult!.warnings, failed: validationResult!.failed },
        tamperingSummary: { overallScore: tamperingResult!.overallScore, status: tamperingResult!.overallStatus, findingsCount: tamperingResult!.findings.length },
        faceVerificationSummary: { similarity: faceResult!.similarity, decision: faceResult!.decision, liveness: faceResult!.presentedFace.livenessStatus },
        riskAssessment: { score: riskResult!.score, level: riskResult!.level, recommendation: riskResult!.recommendation },
        findings: [], conclusion: riskResult!.explanation.join(' '),
      };
    }

    const response = await apiRequest<AnalysisReport>(`${API_ENDPOINTS.reports}/${caseId}/preview`);
    return response.data;
  },
};

export { reportService as default };
