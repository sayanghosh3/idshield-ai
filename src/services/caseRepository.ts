import type { ScreeningCase, OfficerReview } from '../types/screening.ts';
import type { CaseListItem, AuditEvent, Report } from '../types/case.ts';
import { mockScreeningCases } from '../mocks/screeningData.ts';
import { mockCases, mockAuditEvents, mockReports } from '../mocks/cases.ts';
import { initialStepStatuses, hasCompleteResult } from '../utils/screeningStatus.ts';
import { generateEvidence } from './demoWorkflow.ts';
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
    status: record.caseStatus ?? metadata?.status ?? 'open', priority: metadata?.priority ?? 'medium',
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
    reviewCase: (id: string, input: Omit<OfficerReview, 'reviewedAt'>) => {
      const record = snapshot.cases.find(item => item.id === id);
      if (!record || !hasCompleteResult(record)) throw new Error('Complete the screening before officer review.');
      if (record.officerReview) throw new Error('This case already has a final officer decision.');
      if (!['clear', 'secondary_inspection', 'refer'].includes(input.decision)) throw new Error('Select a valid officer decision.');
      if (!input.officer.trim() || !input.notes.trim()) throw new Error('Officer name and review notes are required.');
      const now = new Date();
      const review: OfficerReview = { ...input, officer: input.officer.trim(), notes: input.notes.trim(), reviewedAt: now };
      const updated: ScreeningCase = { ...record, officerReview: review, caseStatus: input.decision === 'clear' ? 'closed' : 'escalated', updatedAt: now };
      const cases = snapshot.cases.map(item => item.id === id ? updated : item);
      const event: AuditEvent = {
        id: crypto.randomUUID(), caseId: id, timestamp: now, event: 'Officer review recorded',
        category: 'user', status: 'info', actor: review.officer, actorType: 'user',
        details: { decision: review.decision, notes: review.notes, simulated: true },
      };
      snapshot = { ...snapshot, cases, listItems: cases.map(toCaseListItem), auditEvents: [...snapshot.auditEvents, event] };
      emit();
      return updated;
    },
    generateReport: (id: string, type: Report['type'] = 'screening') => {
      const record = snapshot.cases.find(item => item.id === id);
      if (!record || !hasCompleteResult(record)) throw new Error('Select a completed screening case.');
      const now = new Date();
      const content = JSON.stringify({
        demo: true, governmentDatabaseAccess: false, type, generatedAt: now,
        caseId: record.id, caseNumber: record.caseNumber, subjectName: record.subjectName,
        simulation: record.demo ?? { inputSource: 'sample' },
        inputs: record.documents.map(({ name, type, size }) => ({ name, type, size })),
        selfie: record.selfie ? { name: record.selfie.name, type: record.selfie.type, size: record.selfie.size } : null,
        stepStatuses: record.stepStatuses, ocr: record.ocrResult, validation: record.validationResult,
        tampering: record.tamperingResult, face: record.faceResult, riskRecommendation: record.riskResult,
        evidence: record.evidence ?? generateEvidence(record),
        officerDecision: record.officerReview ?? null,
        reviewStatus: record.officerReview ? 'Officer decision recorded' : 'Awaiting officer review',
        audit: snapshot.auditEvents.filter(event => event.caseId === id),
      }, null, 2);
      const report: Report = {
        id: crypto.randomUUID(), caseId: id, type, title: 'Demo ' + type + ' report — ' + record.caseNumber,
        format: 'json', status: 'ready', generatedBy: 'Demo Operator', generatedAt: now,
        fileSize: new TextEncoder().encode(content).length, content,
      };
      const event: AuditEvent = { id: crypto.randomUUID(), caseId: id, timestamp: now,
        event: 'Demo JSON report generated', category: 'user', status: 'info', actor: 'Demo Operator',
        actorType: 'user', details: { reportId: report.id, format: 'json' } };
      snapshot = { ...snapshot, reports: [report, ...snapshot.reports], auditEvents: [...snapshot.auditEvents, event] };
      emit();
      return report;
    },
  };
}
export const caseRepository = createCaseRepository();
