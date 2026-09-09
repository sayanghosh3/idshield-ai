import { DocumentFile, DocumentType, OCRResult, MRZData, ExtractedField } from '../types';
import { apiRequest, API_ENDPOINTS } from './api';
import { demoDocuments, demoOCRResults, documentTypes, allowedFileTypes, maxFileSize } from '../mocks';

const DEMO_MODE = import.meta.env.VITE_APP_ENV !== 'production';
const SIMULATED_DELAY = 600;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const documentService = {
  getDocumentTypes() {
    return documentTypes;
  },

  getAllowedFileTypes() {
    return allowedFileTypes;
  },

  getMaxFileSize() {
    return maxFileSize;
  },

  async uploadDocument(file: File): Promise<DocumentFile> {
    if (DEMO_MODE) {
      await delay(300);
      const preview = URL.createObjectURL(file);
      return {
        id: `doc-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        preview,
        documentType: 'passport' as DocumentType,
        uploadedAt: new Date(),
      };
    }

    const response = await apiRequest<DocumentFile>(API_ENDPOINTS.documents, {
      method: 'POST',
      body: file,
    });
    return response.data;
  },

  async getDocument(documentId: string): Promise<DocumentFile> {
    if (DEMO_MODE) {
      await delay(100);
      const document = Object.values(demoDocuments).find(d => d.id === documentId);
      if (!document) throw new Error('Document not found');
      return document;
    }

    const response = await apiRequest<DocumentFile>(`${API_ENDPOINTS.documents}/${documentId}`);
    return response.data;
  },

  async deleteDocument(documentId: string): Promise<void> {
    if (DEMO_MODE) {
      await delay(100);
      return;
    }

    await apiRequest<void>(`${API_ENDPOINTS.documents}/${documentId}`, {
      method: 'DELETE',
    });
  },

  async extractOCR(documentId: string, documentType: DocumentType): Promise<OCRResult> {
    if (DEMO_MODE) {
      await delay(SIMULATED_DELAY * 2);
      const key = Object.keys(demoDocuments).find(key => demoDocuments[key].id === documentId && demoDocuments[key].documentType === documentType);
      if (!key || !demoOCRResults[key]) throw new Error('No OCR result available for this document');
      return demoOCRResults[key];
    }

    const response = await apiRequest<OCRResult>(API_ENDPOINTS.ocr, {
      method: 'POST',
      body: JSON.stringify({ documentId, documentType }),
    });
    return response.data;
  },

  async parseMRZ(ocrResult: OCRResult): Promise<MRZData | null> {
    if (DEMO_MODE) {
      await delay(200);
      return ocrResult.mrz || null;
    }

    const response = await apiRequest<MRZData>(`${API_ENDPOINTS.ocr}/mrz`, {
      method: 'POST',
      body: JSON.stringify({ ocrResult }),
    });
    return response.data;
  },

  validateFile(file: File): { valid: boolean; error?: string } {
    if (!allowedFileTypes.includes(file.type)) {
      return { valid: false, error: 'Invalid file type. Allowed: PNG, JPG, JPEG, PDF' };
    }
    if (file.size > maxFileSize) {
      return { valid: false, error: `File too large. Maximum size: ${maxFileSize / (1024 * 1024)}MB` };
    }
    return { valid: true };
  },

  getDemoDocuments() {
    return demoDocuments;
  },
};

export { documentService as default };
