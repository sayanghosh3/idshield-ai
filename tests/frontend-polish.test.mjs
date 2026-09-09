import test from 'node:test';
import assert from 'node:assert/strict';
import { groupRiskCases, caseStatusVariants } from '../src/utils/casePresentation.ts';
import { createCaseRepository } from '../src/services/caseRepository.ts';
test('risk grouping preserves canonical records, descending scores and input order', () => {
  const records = createCaseRepository().getSnapshot().listItems;
  const before = [...records];
  const groups = groupRiskCases(records);
  assert.deepEqual(Object.keys(groups), ['high', 'review', 'low', 'unknown']);
  assert.deepEqual(records, before);
  assert.equal(Object.values(groups).flat().length, records.length);
  for (const [risk, rows] of Object.entries(groups)) {
    rows.forEach((row, index) => {
      assert.equal(row.riskLevel, risk);
      assert.equal(records.find(item => item.id === row.id), row);
      if (index) assert.ok((rows[index - 1].riskScore ?? -1) >= (row.riskScore ?? -1));
    });
  }
});
test('risk grouping retains unavailable and zero scores honestly', () => {
  const base = createCaseRepository().getSnapshot().listItems[0];
  const records = [{...base, id: 'zero', riskLevel: 'low', riskScore: 0}, {...base, id: 'null', riskLevel: 'unknown', riskScore: null}];
  const groups = groupRiskCases(records);
  assert.equal(groups.low[0].riskScore, 0);
  assert.equal(groups.unknown[0].riskScore, null);
});
test('badge mappings cover the actual five officer case statuses', () => {
  assert.deepEqual(caseStatusVariants, {closed:'success', archived:'neutral', under_review:'warning', escalated:'danger', open:'info'});
});
