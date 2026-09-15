import {
  DocumentFile,
  DocumentType,
  OCRResult,
  MRZData,
  ValidationResult,
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

/**
 * Runtime response returned by:
 * POST /api/tampering/analyze
 */
export interface TamperingFinding {
  id: string;
  category: string;
  severity:
    | 'info'
    | 'low'
    | 'medium'
    | 'high'
    | 'critical';
  title: string;
  description: string;
}

export interface TamperingResult {
  tamperingScore: number;
  verdict: 'low' | 'medium' | 'high';
  confidence: number;

  findings: TamperingFinding[];

  signals: {
    ela: {
      meanError: number;
      maxError: number;
      stdError: number;
      highErrorRatio: number;
      signal: number;
    };

    noise: {
      globalNoiseStd: number;
      regionalMean: number;
      regionalStd: number;
      uniformityRatio: number;
      signal: number;
    };

    edges: {
      edgeDensity: number;
      regionalMean: number;
      regionalStd: number;
      signal: number;
    };

    texture: {
      meanGradient: number;
      gradientStd: number;
      regionalStd: number;
      signal: number;
    };
  };

  quality: {
    sharpness: number;
    sharpnessStatus: string;
    entropy: number;
    entropyStatus: string;
  };

  metadata: {
    format: string;
    mode: string;
    size: {
      width: number;
      height: number;
    };
    hasExif: boolean;
    exifCount: number;
  };

  image: {
    width: number;
    height: number;
  };

  processingTime: number;
  analysisId: string;
  method: string;
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
      ).find(
        (doc) => doc.id === documentId
      );

      if (!document) {
        throw new Error(
          'Document not found'
        );
      }

      return document;
    }

    const response =
      await apiRequest<DocumentFile>(
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

    const response =
      await apiRequest<void>(
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
      await delay(
        SIMULATED_DELAY * 2
      );

      const key = Object.keys(
        demoDocuments
      ).find(
        (demoKey) =>
          demoDocuments[demoKey].id ===
            documentId &&
          demoDocuments[demoKey]
            .documentType ===
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

    const response =
      await apiRequest<OCRResult>(
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
        response.error ||
          'OCR extraction failed'
      );
    }

    return response.data;
  },

  async validateDocument(
    ocrResult: OCRResult,
    documentType?: DocumentType
  ): Promise<ValidationResult> {
    if (DEMO_MODE) {
      await delay(
        SIMULATED_DELAY
      );

      const validationData =
        (
          ocrResult as OCRResult & {
            validation?: {
              score?: number;
              checks?: Record<
                string,
                boolean
              >;
            };
          }
        ).validation;

      const rawChecks =
        validationData?.checks ?? {};

      const checks = Object.entries(
        rawChecks
      ).map(
        ([name, passed]) => ({
          id: name
            .toLowerCase()
            .replace(
              /[^a-z0-9]+/g,
              '-'
            ),

          name,

          description: passed
            ? `${name} check passed.`
            : `${name} check failed or could not be verified.`,

          category: name
            .toLowerCase()
            .includes('date')
            ? 'dates'
            : 'document',

          status: passed
            ? 'pass'
            : 'fail',
        })
      );

      const passed =
        checks.filter(
          (check) =>
            check.status ===
            'pass'
        ).length;

      const failed =
        checks.filter(
          (check) =>
            check.status ===
            'fail'
        ).length;

      const score =
        validationData?.score ??
        (
          checks.length > 0
            ? (passed /
                checks.length) *
              100
            : 0
        );

      const result = {
        overallStatus:
          score >= 90
            ? 'pass'
            : score >= 60
              ? 'warning'
              : 'fail',

        score,

        passed,

        warnings: 0,

        failed,

        checks,
      };

      return result as unknown as ValidationResult;
    }

    const resolvedDocumentType =
      documentType ??
      (ocrResult.documentType as DocumentType);

    const response =
      await apiRequest<ValidationResult>(
        API_ENDPOINTS.validation,
        {
          method: 'POST',
          body: JSON.stringify({
            ocrResult,
            documentType:
              resolvedDocumentType,
          }),
        }
      );

    if (!response.success) {
      throw new Error(
        response.error ||
          'Document validation failed'
      );
    }

    return response.data;
  },

  /**
   * Real backend forensic analysis.
   *
   * POST /api/tampering/analyze
   *
   * The backend currently performs heuristic
   * image-forensics analysis using ELA, noise,
   * edge, texture, image-quality and metadata
   * signals.
   */
  async analyzeTampering(
    file: File
  ): Promise<TamperingResult> {
    if (DEMO_MODE) {
      await delay(
        SIMULATED_DELAY
      );

      return {
        tamperingScore: 0,
        verdict: 'low',
        confidence: 100,

        findings: [
          {
            id: 'demo-no-anomalies',
            category: 'forensics',
            severity: 'info',
            title:
              'No strong forensic anomalies detected',
            description:
              'Demo mode returned a clean forensic result.',
          },
        ],

        signals: {
          ela: {
            meanError: 0,
            maxError: 0,
            stdError: 0,
            highErrorRatio: 0,
            signal: 0,
          },

          noise: {
            globalNoiseStd: 0,
            regionalMean: 0,
            regionalStd: 0,
            uniformityRatio: 0,
            signal: 0,
          },

          edges: {
            edgeDensity: 0,
            regionalMean: 0,
            regionalStd: 0,
            signal: 0,
          },

          texture: {
            meanGradient: 0,
            gradientStd: 0,
            regionalStd: 0,
            signal: 0,
          },
        },

        quality: {
          sharpness: 0,
          sharpnessStatus: 'unknown',
          entropy: 0,
          entropyStatus: 'unknown',
        },

        metadata: {
          format: file.type || 'unknown',
          mode: 'unknown',
          size: {
            width: 0,
            height: 0,
          },
          hasExif: false,
          exifCount: 0,
        },

        image: {
          width: 0,
          height: 0,
        },

        processingTime: 0,
        analysisId: crypto.randomUUID(),
        method: 'demo',
      };
    }

    const response =
      await apiUpload(
        API_ENDPOINTS.tampering,
        file
      );

    if (!response.success) {
      throw new Error(
        response.error ||
          'Tampering analysis failed'
      );
    }

    return response.data as unknown as TamperingResult;
  },

  async parseMRZ(
    ocrResult: OCRResult
  ): Promise<MRZData | null> {
    if (DEMO_MODE) {
      await delay(200);

      return ocrResult.mrz || null;
    }

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
        response.error ||
          'MRZ parsing failed'
      );
    }

    return response.data;
  },

  getDemoDocuments() {
    return demoDocuments;
  },
};

export default documentService;