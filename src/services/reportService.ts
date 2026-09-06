import { Report, AnalysisReport } from '../types';
import { apiRequest, API_ENDPOINTS } from './api';

const DEMO_MODE = import.meta.env.VITE_APP_ENV !== 'production';
const SIMULATED_DELAY = 1500;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const reportService = {
  async generateReport(caseId: string, type: Report['type'] = 'screening', format: Report['format'] = 'pdf'): Promise<Report> {
    if (DEMO_MODE) {
      await delay(SIMULATED_DELAY);
      return {
        id: `report-${Date.now()}`,
        caseId,
        type,
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Report - ${caseId}`,
        format,
        status: 'ready',
        generatedBy: 'Security Operator',
        generatedAt: new Date(),
        downloadUrl: `/reports/${caseId}-${type}.${format}`,
        fileSize: format === 'pdf' ? 245760 : 102400,
      };
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
      return {
        id: reportId,
        caseId: 'case-1',
        type: 'screening',
        title: 'Screening Report',
        format: 'pdf',
        status: 'ready',
        generatedBy: 'Security Operator',
        generatedAt: new Date(),
        downloadUrl: `/reports/${reportId}.pdf`,
        fileSize: 245760,
      };
    }

    const response = await apiRequest<Report>(`${API_ENDPOINTS.reports}/${reportId}`);
    return response.data;
  },

  async listReports(caseId: string): Promise<Report[]> {
    if (DEMO_MODE) {
      await delay(200);
      return [
        {
          id: 'report-1',
          caseId,
          type: 'screening',
          title: 'Screening Report',
          format: 'pdf',
          status: 'ready',
          generatedBy: 'Security Operator',
          generatedAt: new Date(),
          downloadUrl: `/reports/${caseId}-screening.pdf`,
          fileSize: 245760,
        },
        {
          id: 'report-2',
          caseId,
          type: 'forensic',
          title: 'Forensic Analysis Report',
          format: 'pdf',
          status: 'ready',
          generatedBy: 'Security Operator',
          generatedAt: new Date(),
          downloadUrl: `/reports/${caseId}-forensic.pdf`,
          fileSize: 512000,
        },
      ];
    }

    const response = await apiRequest<Report[]>(`${API_ENDPOINTS.reports}?caseId=${caseId}`);
    return response.data;
  },

  async downloadReport(reportId: string): Promise<Blob> {
    if (DEMO_MODE) {
      await delay(500);
      const content = this.generateMockReportContent(reportId);
      return new Blob([content], { type: 'application/pdf' });
    }

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${API_ENDPOINTS.reports}/${reportId}/download`);
    return response.blob();
  },

  generateMockReportContent(reportId: string): string {
    return `%PDF-1.4
%Mock PDF Report for ${reportId}
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 12 Tf 100 700 Td (IDShield AI Screening Report) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000206 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
299
%%EOF`;
  },

  async previewReport(caseId: string): Promise<AnalysisReport> {
    if (DEMO_MODE) {
      await delay(500);
      return {
        caseId,
        generatedAt: new Date(),
        generatedBy: 'Security Operator',
        documentInfo: {
          type: 'Passport',
          fileName: 'Passport_ALEX_KUMAR.pdf',
          fileSize: 2689100,
        },
        extractedFields: {
          'Full Name': { value: 'ALEX KUMAR', confidence: 94 },
          'Passport Number': { value: 'Z5555555', confidence: 93 },
          'Nationality': { value: 'IND', confidence: 98 },
          'Date of Birth': { value: '22 AUG 1990', confidence: 89 },
          'Gender': { value: 'M', confidence: 99 },
          'Date of Issue': { value: '22 AUG 2018', confidence: 91 },
          'Date of Expiry': { value: '22 AUG 2028', confidence: 92 },
          'Place of Birth': { value: 'MUMBAI', confidence: 87 },
        },
        validationSummary: { total: 10, passed: 6, warnings: 1, failed: 1 },
        tamperingSummary: { overallScore: 68, status: 'Suspicious', findingsCount: 6 },
        faceVerificationSummary: { similarity: 87.2, decision: 'Match', liveness: 'Backend Required' },
        riskAssessment: { score: 82, level: 'High', recommendation: 'Secondary Inspection' },
        findings: [],
        conclusion: 'AI-assisted analysis indicates potential document tampering. Recommend secondary inspection.',
      };
    }

    const response = await apiRequest<AnalysisReport>(`${API_ENDPOINTS.reports}/${caseId}/preview`);
    return response.data;
  },
};

export { reportService as default };