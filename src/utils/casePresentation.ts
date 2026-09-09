import type { CaseStatus, CaseListItem } from '../types/case.ts';
export const caseStatusVariants = {
  closed: 'success', archived: 'neutral', under_review: 'warning', escalated: 'danger', open: 'info',
} as const satisfies Record<CaseStatus, 'success' | 'neutral' | 'warning' | 'danger' | 'info'>;
const order = { high: 0, review: 1, low: 2, unknown: 3 } as const;
export function groupRiskCases(records: readonly CaseListItem[]) {
  const groups: Record<keyof typeof order, CaseListItem[]> = { high: [], review: [], low: [], unknown: [] };
  for (const record of [...records].sort((a, b) => order[a.riskLevel] - order[b.riskLevel] || (b.riskScore ?? -1) - (a.riskScore ?? -1))) groups[record.riskLevel].push(record);
  return groups;
}
