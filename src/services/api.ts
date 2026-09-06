export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  meta?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UploadResponse {
  fileId: string;
  fileName: string;
  size: number;
  uploadUrl?: string;
}

export const API_ENDPOINTS = {
  screenings: '/api/screenings',
  documents: '/api/documents',
  ocr: '/api/ocr',
  validation: '/api/validate',
  tampering: '/api/tampering/analyze',
  face: '/api/face/verify',
  risk: '/api/risk',
  cases: '/api/cases',
  reports: '/api/reports',
  audit: '/api/audit',
} as const;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const url = `${baseUrl}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || `API Error: ${response.status}`,
      response.status,
      errorData.code,
      errorData.details
    );
  }

  return response.json();
}

export async function apiUpload(
  endpoint: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<ApiResponse<UploadResponse>> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const url = `${baseUrl}${endpoint}`;

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.message || `Upload Error: ${response.status}`,
      response.status,
      errorData.code,
      errorData.details
    );
  }

  return response.json();
}