import type { ScreeningCase } from '../types/screening.ts';
import type { CaseListItem, AuditEvent, Report } from '../types/case.ts';
import { mockScreeningCases } from '../mocks/screeningData.ts';
import { mockCases, mockAuditEvents, mockReports } from '../mocks/cases.ts';
import { initialStepStatuses } from '../utils/screeningStatus.ts';
export function seedCases(): ScreeningCase[] {
  return mockCases.map<ScreeningCase>(item => {
    const complete = mockScreeningCases.find(record => record.id === item.id);
    return complete ? { ...complete, assignedOperator: item.assignedOperator } : {
      id: item.id, caseNumber: item.caseNumber, subjectName: item.subjectName, documentType: item.documentType,
      status: 'draft', riskLevel: 'unknown', riskScore: null, documents: [], currentStep: 'upload',
      createdAt: item.createdAt, updatedAt: item.updatedAt, assignedOperator: item.assignedOperator, tags: item.tags,
      stepStatuses: initialStepStatuses(),
    };
  });
}
export function toCaseListItem(record: ScreeningCase): CaseListItem {
  const metadata = mockCases.find(item => item.id === record.id);
  return {
    id: record.id, caseNumber: record.caseNumber,
    subjectName: record.subjectName ?? record.ocrResult?.extractedFields.find(field => field.key === 'fullName')?.value ?? 'Unknown',
    documentType: record.documentType ?? record.documents[0]?.documentType ?? 'Unknown',
    riskLevel: record.riskLevel, riskScore: record.riskScore,
    status: metadata?.status ?? 'open', priority: metadata?.priority ?? 'medium',
    createdAt: record.createdAt, updatedAt: record.updatedAt, assignedOperator: record.assignedOperator, tags: record.tags,
  };
}
export interface CaseSnapshot { cases: ScreeningCase[]; listItems: CaseListItem[]; auditEvents: AuditEvent[]; reports: Report[] }
export function createCaseRepository() {
  const cases = seedCases();
  let snapshot: CaseSnapshot = { cases, listItems: cases.map(toCaseListItem), auditEvents: [...mockAuditEvents], reports: [...mockReports] };
  const listeners = new Set<() => void>();
  function emit() { listeners.forEach(listener => listener()); }
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    find: (id: string | undefined) => snapshot.cases.find(record => record.id === id || record.caseNumber === id),
    upsert: (record: ScreeningCase) => {
      const existing = snapshot.cases.find(item => item.id === record.id);
      if (existing && existing.caseNumber !== record.caseNumber) throw new Error('Case identity cannot change');
      if (snapshot.cases.some(item => item.caseNumber === record.caseNumber && item.id !== record.id)) throw new Error('Duplicate case number');
      const cases = existing ? snapshot.cases.map(item => item.id === record.id ? record : item) : [record, ...snapshot.cases];
      snapshot = { ...snapshot, cases, listItems: cases.map(toCaseListItem) }; emit();
    },
    addAudit: (event: AuditEvent) => {
      if (!snapshot.cases.some(record => record.id === event.caseId)) throw new Error('Audit event references an unknown case');
      snapshot = { ...snapshot, auditEvents: [...snapshot.auditEvents, event] }; emit();
    },
  };
}
export const caseRepository = createCaseRepository();

