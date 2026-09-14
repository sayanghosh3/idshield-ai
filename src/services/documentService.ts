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


// ============================================================
// DEMO MODE
// ============================================================
// true  -> use existing mock/demo data
// false -> use FastAPI backend
//
// In .env:
//
// VITE_ENABLE_DEMO_MODE=true
// or
// VITE_ENABLE_DEMO_MODE=false
// ============================================================

const DEMO_MODE =
  import.meta.env.VITE_ENABLE_DEMO_MODE === 'true';

const SIMULATED_DELAY = 600;


// ============================================================
// HELPERS
// ============================================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


function createPreview(file: File): string {
  return URL.createObjectURL(file);
}


// ============================================================
// DOCUMENT SERVICE
// ============================================================

export const documentService = {

  // ----------------------------------------------------------
  // DOCUMENT TYPES
  // ----------------------------------------------------------

  getDocumentTypes() {
    return documentTypes;
  },


  // ----------------------------------------------------------
  // ALLOWED FILE TYPES
  // ----------------------------------------------------------

  getAllowedFileTypes() {
    return allowedFileTypes;
  },


  // ----------------------------------------------------------
  // MAX FILE SIZE
  // ----------------------------------------------------------

  getMaxFileSize() {
    return maxFileSize;
  },


  // ----------------------------------------------------------
  // UPLOAD DOCUMENT
  // ----------------------------------------------------------
  //
  // Demo:
  //     Creates a local browser document.
  //
  // Production/backend:
  //     Sends multipart/form-data to FastAPI.
  //
  // Backend endpoint:
  //     POST /api/documents
  //
  // ----------------------------------------------------------

  async uploadDocument(file: File): Promise<DocumentFile> {

    // Validate before uploading
    const validation = this.validateFile(file);

    if (!validation.valid) {
      throw new Error(
        validation.error || 'Invalid document'
      );
    }


    // ========================================================
    // DEMO MODE
    // ========================================================

    if (DEMO_MODE) {
      await delay(300);

      const preview = createPreview(file);

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


    // ========================================================
    // REAL FASTAPI BACKEND
    // ========================================================

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


    // Convert backend response into the frontend
    // DocumentFile structure.
    return {
      id: uploaded.fileId,

      name: uploaded.fileName,

      size: uploaded.size,

      type: file.type,

      // Browser preview remains local.
      preview: createPreview(file),

      documentType: 'passport' as DocumentType,

      uploadedAt: new Date(),
    };
  },


  // ----------------------------------------------------------
  // GET DOCUMENT
  // ----------------------------------------------------------

  async getDocument(
    documentId: string
  ): Promise<DocumentFile> {

    if (DEMO_MODE) {

      await delay(100);

      const document = Object.values(
        demoDocuments
      ).find(
        (doc) => doc.id === documentId
      );

      if (!document) {
        throw new Error('Document not found');
      }

      return document;
    }


    const response =
      await apiRequest<DocumentFile>(
        `${API_ENDPOINTS.documents}/${documentId}`
      );


    if (!response.success) {
      throw new Error(
        response.error || 'Failed to retrieve document'
      );
    }


    return response.data;
  },


  // ----------------------------------------------------------
  // DELETE DOCUMENT
  // ----------------------------------------------------------

  async deleteDocument(
    documentId: string
  ): Promise<void> {

    if (DEMO_MODE) {

      await delay(100);

      return;
    }


    const response =
      await apiRequest<void>(
        `${API_ENDPOINTS.documents}/${documentId}`,
        {
          method: 'DELETE',
        }
      );


    if (!response.success) {
      throw new Error(
        response.error || 'Failed to delete document'
      );
    }
  },


  // ----------------------------------------------------------
  // OCR
  // ----------------------------------------------------------

  async extractOCR(
    documentId: string,
    documentType: DocumentType
  ): Promise<OCRResult> {

    // ========================================================
    // DEMO MODE
    // ========================================================

    if (DEMO_MODE) {

      await delay(
        SIMULATED_DELAY * 2
      );


      const key = Object.keys(
        demoDocuments
      ).find(
        (key) =>
          demoDocuments[key].id === documentId &&
          demoDocuments[key].documentType === documentType
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


    // ========================================================
    // REAL FASTAPI BACKEND
    // ========================================================

    const response =
      await apiRequest<OCRResult>(
        API_ENDPOINTS.ocr,
        {
          method: 'POST',

          body: JSON.stringify({
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


  // ----------------------------------------------------------
  // MRZ PARSING
  // ----------------------------------------------------------

  async parseMRZ(
    ocrResult: OCRResult
  ): Promise<MRZData | null> {

    // ========================================================
    // DEMO MODE
    // ========================================================

    if (DEMO_MODE) {

      await delay(200);

      return ocrResult.mrz || null;
    }


    // ========================================================
    // REAL FASTAPI BACKEND
    // ========================================================

    const response =
      await apiRequest<MRZData>(
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


  // ----------------------------------------------------------
  // FILE VALIDATION
  // ----------------------------------------------------------

  validateFile(
    file: File
  ): {
    valid: boolean;
    error?: string;
  } {

    // File type
    if (!allowedFileTypes.includes(file.type)) {

      return {
        valid: false,

        error:
          'Invalid file type. Allowed: PNG, JPG, JPEG, PDF',
      };
    }


    // File size
    if (file.size > maxFileSize) {

      return {
        valid: false,

        error:
          `File too large. Maximum size: ${
            maxFileSize /
            (1024 * 1024)
          }MB`,
      };
    }


    return {
      valid: true,
    };
  },


  // ----------------------------------------------------------
  // DEMO DOCUMENTS
  // ----------------------------------------------------------

  getDemoDocuments() {
    return demoDocuments;
  },
};


// ============================================================
// DEFAULT EXPORT
// ============================================================

export default documentService;