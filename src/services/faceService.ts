import { FaceVerificationResult } from '../types';
import { apiRequest, API_ENDPOINTS } from './api';

const DEMO_MODE = import.meta.env.VITE_APP_ENV !== 'production';
const SIMULATED_DELAY = 1000;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const faceService = {
  async verifyFace(
    documentImageId: string,
    presentedImageId: string,
    options?: { threshold?: number; requireLiveness?: boolean }
  ): Promise<FaceVerificationResult> {
    if (DEMO_MODE) {
      await delay(SIMULATED_DELAY * 2);
      return {
        documentFace: {
          detected: true,
          boundingBox: { x: 0.15, y: 0.12, width: 0.28, height: 0.35 },
          qualityScore: 92,
        },
        presentedFace: {
          detected: true,
          boundingBox: { x: 0.35, y: 0.10, width: 0.30, height: 0.38 },
          qualityScore: 88,
          livenessStatus: 'backend_required',
        },
        similarity: 96.8,
        decision: 'match',
        threshold: options?.threshold || 85,
        analysisTime: 1560,
      };
    }

    const response = await apiRequest<FaceVerificationResult>(API_ENDPOINTS.face, {
      method: 'POST',
      body: JSON.stringify({ documentImageId, presentedImageId, options }),
    });
    return response.data;
  },

  async detectFaces(imageId: string): Promise<{ faces: Array<{ boundingBox: { x: number; y: number; width: number; height: number }; confidence: number }> }> {
    if (DEMO_MODE) {
      await delay(500);
      return {
        faces: [
          { boundingBox: { x: 0.15, y: 0.12, width: 0.28, height: 0.35 }, confidence: 0.98 },
        ],
      };
    }

    const response = await apiRequest<{ faces: Array<{ boundingBox: { x: number; y: number; width: number; height: number }; confidence: number }> }>(
      `${API_ENDPOINTS.face}/detect`,
      { method: 'POST', body: JSON.stringify({ imageId }) }
    );
    return response.data;
  },

  async checkLiveness(imageId: string): Promise<{ status: 'live' | 'spoof' | 'unknown' | 'backend_required'; confidence: number }> {
    if (DEMO_MODE) {
      await delay(800);
      return { status: 'backend_required', confidence: 0 };
    }

    const response = await apiRequest<{ status: 'live' | 'spoof' | 'unknown'; confidence: number }>(
      `${API_ENDPOINTS.face}/liveness`,
      { method: 'POST', body: JSON.stringify({ imageId }) }
    );
    return response.data;
  },

  getDefaultThreshold(): number {
    return 85;
  },
};

export { faceService as default };