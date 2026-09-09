import { ScreeningCase, RiskLevel, ScreeningStatus } from './screening';
import { EvidenceItem } from './analysis';

export type CaseStatus = 'open' | 'under_review' | 'closed' | 'escalated' | 'archived';
export type CasePriority = 'low' | 'medium' | 'high' | 'critical';

export interface CaseFilters {
  status?: CaseStatus[];
  riskLevel?: RiskLevel[];
  dateRange?: { from: Date; to: Date };
  searchQuery?: string;
  documentType?: string[];
  assignedOperator?: string;
}

export interface CaseSort {
  field: 'createdAt' | 'updatedAt' | 'riskScore' | 'caseNumber' | 'status';
  direction: 'asc' | 'desc';
}

export interface PaginatedCases {
  cases: CaseListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CaseListItem {
  id: string;
  caseNumber: string;
  subjectName: string;
  documentType: string;
  riskLevel: RiskLevel;
  riskScore: number | null;
  status: CaseStatus;
  priority: CasePriority;
  createdAt: Date;
  updatedAt: Date;
  assignedOperator?: string;
  tags: string[];
}

export interface CaseDetails extends ScreeningCase {
  caseStatus: CaseStatus;
  priority: CasePriority;
  evidence: EvidenceItem[];
  auditTrail: AuditEvent[];
  notes: CaseNote[];
  reports: Report[];
}

export interface CaseNote {
  id: string;
  caseId: string;
  author: string;
  content: string;
  createdAt: Date;
  isInternal: boolean;
}

export interface AuditEvent {
  id: string;
  caseId: string;
  timestamp: Date;
  event: string;
  category: 'system' | 'user' | 'api' | 'ai';
  status: 'success' | 'warning' | 'error' | 'info';
  actor: string;
  actorType: 'user' | 'system' | 'api';
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface Report {
  content?: string;
  id: string;
  caseId: string;
  type: 'screening' | 'forensic' | 'summary' | 'custom';
  title: string;
  format: 'pdf' | 'html' | 'json';
  status: 'generating' | 'ready' | 'failed';
  generatedBy: string;
  generatedAt: Date;
  downloadUrl?: string;
  fileSize?: number;
}

export interface CaseAction {
  type: 'open' | 'review' | 'generate_report' | 'escalate' | 'close' | 'reopen' | 'assign' | 'tag';
  label: string;
  icon: string;
  variant: 'primary' | 'secondary' | 'danger' | 'ghost';
  requiresConfirmation: boolean;
}
