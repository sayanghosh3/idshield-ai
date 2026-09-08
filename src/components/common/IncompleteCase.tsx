import { Link } from 'react-router-dom';
import type { ScreeningCase } from '../../types';
import { STEP_ORDER, initialStepStatuses } from '../../utils/screeningStatus';
import { AnimatedStatus } from '../animations';
import { Card } from './Card';

export function IncompleteCase({ record }: { record?: ScreeningCase }) {
  const statuses = record?.stepStatuses ?? initialStepStatuses();
  return <Card padding="lg" className="max-w-4xl mx-auto space-y-4">
    <h1 className="text-2xl font-bold">{record?.caseNumber ?? 'Case not found'}</h1>
    <p>{record ? `${record.subjectName ?? 'Unknown subject'} — ${record.status}` : 'No case matches this URL.'}</p>
    <p className="text-muted-text">{record ? 'No final risk assessment is available. Incomplete steps are not successful checks.' : 'Check the case ID or choose a case from the list.'}</p>
    {record && <ul className="space-y-2">{STEP_ORDER.map(step => <li key={step}>
      <AnimatedStatus status={statuses[step]}>{step.replaceAll('_', ' ')}: {statuses[step]}</AnimatedStatus>
    </li>)}</ul>}
    <Link className="btn-secondary inline-flex" to="/cases">Back to Cases</Link>
  </Card>;
}
