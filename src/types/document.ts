export type DocumentType = 
  | 'passport' 
  | 'visa' 
  | 'national_id' 
  | 'driving_license' 
  | 'permit' 
  | 'other';

export type DocumentCategory = 'travel' | 'identity' | 'permit' | 'other';

export interface DocumentFile {
  id: string;
  name: string;
  size: number;
  type: string;
  preview: string;
  documentType: DocumentType;
  uploadedAt: Date;
}

export interface ExtractedField {
  key: string;
  label: string;
  value: string;
  confidence: number;
  source: 'ocr' | 'mrz' | 'manual';
  verified: boolean;
}

export interface MRZData {
  line1: string;
  line2: string;
  line3?: string;
  parsedFields: Record<string, string>;
}

export interface OCRResult {
  documentType: DocumentType;
  extractedFields: ExtractedField[];
  mrz?: MRZData;
  overallConfidence: number;
  processingTime: number;
  rawText: string;
}

export interface DocumentMetadata {
  format: string;
  dimensions: { width: number; height: number };
  fileSize: number;
  createdAt?: Date;
  modifiedAt?: Date;
  author?: string;
  software?: string;
  colorSpace?: string;
  compression?: string;
  exif?: Record<string, unknown>;
}