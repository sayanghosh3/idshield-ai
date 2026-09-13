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

export function apiUrl(endpoint: string): string {
  return `${(import.meta.env?.VITE_API_BASE_URL || '').replace(/\/$/, '')}${endpoint}`;
}

async function checkedFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    if (typeof options.body === 'string') headers.set('Content-Type', 'application/json');
    else if (options.body instanceof Blob && options.body.type) headers.set('Content-Type', options.body.type);
  }
  const response = await fetch(apiUrl(endpoint), { ...options, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new ApiError(error?.message || `API Error: ${response.status}`, response.status, error?.code || error?.error, error?.details);
  }
  return response;
}

export async function apiDownload(endpoint: string, options: RequestInit = {}): Promise<Blob> {
  return (await checkedFetch(endpoint, options)).blob();
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const response = await checkedFetch(endpoint, options);
  if (response.status === 204 || response.status === 205 || options.method?.toUpperCase() === 'HEAD') {
    return { success: true, data: undefined as T };
  }
  return response.json();
}

export async function apiUpload(
  endpoint: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<ApiResponse<UploadResponse>> {
  const formData = new FormData();
  formData.append('file', file);

  onProgress?.(0);
  const response = await apiRequest<UploadResponse>(endpoint, {
    method: 'POST',
    body: formData,
  });

  onProgress?.(100);
  return response;
}
