export interface FaceVerificationResult {
  similarity: number;
  decision: 'match' | 'mismatch';
  verified: boolean;
  distance: number;
  threshold: number;
  model: string;
  detector: string;
  liveness: 'not_checked' | 'live' | 'spoof' | 'unknown';

  documentFace: {
    detected: boolean;
    qualityScore: number;
  };

  presentedFace: {
    detected: boolean;
    qualityScore: number;
    livenessStatus: 'not_checked' | 'live' | 'spoof' | 'unknown';
  };

  processingTime: number;
  analysisId: string;
  method: string;
}

interface FaceVerificationApiResponse {
  success: boolean;
  data: FaceVerificationResult;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const faceService = {
  async verifyFace(
    documentFile: File,
    presentedFile: File,
  ): Promise<FaceVerificationResult> {
    const allowedTypes = new Set([
      'image/png',
      'image/jpeg',
      'image/jpg',
    ]);

    const maxFileSize = 10 * 1024 * 1024;

    if (!(documentFile instanceof File)) {
      throw new Error('A document face image is required.');
    }

    if (!(presentedFile instanceof File)) {
      throw new Error('A presented-person image is required.');
    }

    if (!allowedTypes.has(documentFile.type)) {
      throw new Error(
        'The document face image must be a PNG or JPEG image.',
      );
    }

    if (!allowedTypes.has(presentedFile.type)) {
      throw new Error(
        'The presented-person image must be a PNG or JPEG image.',
      );
    }

    if (documentFile.size === 0) {
      throw new Error(
        'The document face image is empty.',
      );
    }

    if (presentedFile.size === 0) {
      throw new Error(
        'The presented-person image is empty.',
      );
    }

    if (documentFile.size > maxFileSize) {
      throw new Error(
        'The document face image must be at most 10 MiB.',
      );
    }

    if (presentedFile.size > maxFileSize) {
      throw new Error(
        'The presented-person image must be at most 10 MiB.',
      );
    }

    const formData = new FormData();

    formData.append(
      'document',
      documentFile,
      documentFile.name,
    );

    formData.append(
      'presented',
      presentedFile,
      presentedFile.name,
    );

    const response = await fetch(
      `${API_BASE_URL}/api/face/verify`,
      {
        method: 'POST',
        body: formData,
      },
    );

    let responseBody: unknown = null;

    try {
      responseBody = await response.json();
    } catch {
      throw new Error(
        `Face verification returned an invalid response (${response.status}).`,
      );
    }

    if (!response.ok) {
      const errorDetail =
        typeof responseBody === 'object' &&
        responseBody !== null &&
        'detail' in responseBody &&
        typeof responseBody.detail === 'string'
          ? responseBody.detail
          : `Face verification failed with HTTP ${response.status}.`;

      throw new Error(errorDetail);
    }

    if (
      typeof responseBody !== 'object' ||
      responseBody === null ||
      !('success' in responseBody) ||
      !('data' in responseBody)
    ) {
      throw new Error(
        'Face verification returned an invalid response.',
      );
    }

    const result =
      responseBody as FaceVerificationApiResponse;

    if (!result.success) {
      throw new Error(
        'Face verification was not successful.',
      );
    }

    return result.data;
  },
};

export default faceService;