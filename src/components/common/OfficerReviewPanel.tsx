import { useState } from 'react';
import type { ScreeningCase, OfficerReview } from '../../types';
import { caseRepository } from '../../services/caseRepository';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { Button } from './Button';
import { formatDateTime } from '../../utils/formatters';

export function OfficerReviewPanel({ record }: { record: ScreeningCase }) {
  const [officer, setOfficer] = useState('Demo Officer');
  const [decision, setDecision] = useState<OfficerReview['decision']>('secondary_inspection');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const review = record.officerReview;
  return <Card padding="lg" id="officer-review">
    <CardHeader><CardTitle>Officer Review — Final Decision</CardTitle></CardHeader>
    <CardContent>
      {review ? <div className="space-y-2" role="status">
        <p className="font-semibold">{review.decision.replaceAll('_', ' ').toUpperCase()}</p>
        <p>{review.officer} • {formatDateTime(review.reviewedAt)}</p>
        <p className="whitespace-pre-wrap">{review.notes}</p>
        <p className="text-sm text-muted-text">Recorded by the demo officer. This does not authorize a real-world enforcement action.</p>
      </div> : <form className="space-y-4" onSubmit={event => {
        event.preventDefault();
        try { caseRepository.reviewCase(record.id, { officer, decision, notes }); setError(''); }
        catch (err) { setError(err instanceof Error ? err.message : 'Review could not be saved.'); }
      }}>
        <p className="text-sm text-muted-text">Review the evidence below. The AI recommendation does not approve, reject, or detain anyone. Your explicit decision and rationale are required.</p>
        <label className="block label">Officer name<input className="input mt-1" value={officer} onChange={e => setOfficer(e.target.value)} required maxLength={100} /></label>
        <label className="block label">Final decision<select className="input mt-1" value={decision} onChange={e => setDecision(e.target.value as OfficerReview['decision'])}>
          <option value="secondary_inspection">Request secondary inspection</option>
          <option value="clear">Clear after review</option>
          <option value="refer">Refer for further investigation</option>
        </select></label>
        <label className="block label">Review rationale<textarea className="input mt-1 min-h-24" value={notes} onChange={e => setNotes(e.target.value)} required maxLength={2000} /></label>
        {error && <p role="alert" className="text-danger">{error}</p>}
        <Button type="submit" variant="primary">Record officer decision</Button>
      </form>}
    </CardContent>
  </Card>;
}

