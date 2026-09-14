import {
  DocumentFile,
  DocumentType,
  OCRResult,
  MRZData,
} from '../types';

import {
  apiRequest,
  apiUpload,
  API_ENDPOINTS,
} from './api';

import {
  demoDocuments,
  demoOCRResults,
  documentTypes,
  allowedFileTypes,
  maxFileSize,
} from '../mocks';

const DEMO_MODE =
  import.meta.env.VITE_ENABLE_DEMO_MODE === 'true';

const SIMULATED_DELAY = 600;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createPreview(file: File): string {
  return URL.createObjectURL(file);
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

  validateFile(file: File): {
    valid: boolean;
    error?: string;
  } {
    if (!allowedFileTypes.includes(file.type)) {
      return {
        valid: false,
        error:
          'Invalid file type. Allowed: PNG, JPG, JPEG, PDF',
      };
    }

    if (file.size > maxFileSize) {
      return {
        valid: false,
        error: `File too large. Maximum size: ${
          maxFileSize / (1024 * 1024)
        }MB`,
      };
    }

    return {
      valid: true,
    };
  },

  async uploadDocument(
    file: File,
    documentType: DocumentType = 'passport'
  ): Promise<DocumentFile> {
    const validation = this.validateFile(file);

    if (!validation.valid) {
      throw new Error(
        validation.error || 'Invalid document'
      );
    }

    if (DEMO_MODE) {
      await delay(300);

      return {
        id: `doc-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        preview: createPreview(file),
        documentType,
        uploadedAt: new Date(),
      };
    }

    const response = await apiUpload(
      API_ENDPOINTS.documents,
      file
    );

    if (!response.success) {
      throw new Error(
        response.error || 'Document upload failed'
      );
    }

    const uploaded = response.data;

    return {
      id: uploaded.fileId,
      name: uploaded.fileName,
      size: uploaded.size,
      type: file.type,
      preview: createPreview(file),
      documentType,
      uploadedAt: new Date(),
    };
  },

  async getDocument(
    documentId: string
  ): Promise<DocumentFile> {
    if (DEMO_MODE) {
      await delay(100);

      const document = Object.values(
        demoDocuments
      ).find((doc) => doc.id === documentId);

      if (!document) {
        throw new Error('Document not found');
      }

      return document;
    }

    const response = await apiRequest<DocumentFile>(
      `${API_ENDPOINTS.documents}/${documentId}`
    );

    if (!response.success) {
      throw new Error(
        response.error ||
          'Failed to retrieve document'
      );
    }

    return response.data;
  },

  async deleteDocument(
    documentId: string
  ): Promise<void> {
    if (DEMO_MODE) {
      await delay(100);
      return;
    }

    const response = await apiRequest<void>(
      `${API_ENDPOINTS.documents}/${documentId}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.success) {
      throw new Error(
        response.error ||
          'Failed to delete document'
      );
    }
  },

  async extractOCR(
    documentId: string,
    documentType: DocumentType
  ): Promise<OCRResult> {
    if (DEMO_MODE) {
      await delay(SIMULATED_DELAY * 2);

      const key = Object.keys(
        demoDocuments
      ).find(
        (demoKey) =>
          demoDocuments[demoKey].id === documentId &&
          demoDocuments[demoKey].documentType ===
            documentType
      );

      if (
        !key ||
        !demoOCRResults[key]
      ) {
        throw new Error(
          'No OCR result available for this document'
        );
      }

      return demoOCRResults[key];
    }

    const response = await apiRequest<OCRResult>(
      API_ENDPOINTS.ocr,
      {
        method: 'POST',
        body: JSON.stringify({
          fileId: documentId,
          documentId,
          documentType,
        }),
      }
    );

    if (!response.success) {
      throw new Error(
        response.error || 'OCR extraction failed'
      );
    }

    return response.data;
  },

  async parseMRZ(
    ocrResult: OCRResult
  ): Promise<MRZData | null> {
    if (DEMO_MODE) {
      await delay(200);

      return ocrResult.mrz || null;
    }

    const response = await apiRequest<MRZData>(
      `${API_ENDPOINTS.ocr}/mrz`,
      {
        method: 'POST',
        body: JSON.stringify({
          ocrResult,
        }),
      }
    );

    if (!response.success) {
      throw new Error(
        response.error || 'MRZ parsing failed'
      );
    }

    return response.data;
  },

  getDemoDocuments() {
    return demoDocuments;
  },
};

export default documentService;