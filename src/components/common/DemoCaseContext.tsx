import { Link } from 'react-router-dom';
import type { ScreeningCase } from '../../types';
import { Card } from './Card';
import { Badge } from './Badge';

export function DemoCaseContext({ record }: { record: ScreeningCase }) {
  return <Card padding="md" className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="warning">SIH DEMO — SIMULATED</Badge>
      <span className="font-mono">{record.caseNumber}</span>
      <Badge variant={record.officerReview ? 'info' : 'warning'}>{record.officerReview ? 'Officer decision recorded' : 'Awaiting officer review'}</Badge>
    </div>
    <p className="text-sm text-muted-text">OCR, document checks, face comparison and liveness use sample outcomes{record.demo?.inputSource === 'uploaded' ? '; uploaded images are displayed only and are not analyzed' : ''}. No government database or watchlist is connected. The risk recommendation is advisory.</p>
    <div className="flex flex-wrap gap-4 text-sm text-primary-accent">
      <Link to={'/cases/' + record.id + '?tab=document'}>Document analysis</Link>
      <Link to={'/face?caseId=' + record.id}>Face / liveness</Link>
      <Link to={'/screening/result/' + record.id}>Case result</Link>
      <Link to={'/cases/' + record.id}>Officer review</Link>
      <Link to={'/reports?caseId=' + record.id}>Report</Link>
      <Link to="/screening">New screening</Link>
    </div>
  </Card>;
}

