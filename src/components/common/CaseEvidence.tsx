import type { ScreeningCase } from '../../types';
import { generateEvidence } from '../../services/demoWorkflow';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { Badge } from './Badge';
export function CaseEvidence({ record }: { record: ScreeningCase }) {
  const evidence = record.evidence ?? generateEvidence(record);
  return <Card padding="lg"><CardHeader><CardTitle>Case Evidence — Demo Findings</CardTitle></CardHeader>
    <CardContent className="space-y-3">{evidence.map(item => <div key={item.id} className="p-3 bg-panel-secondary rounded-lg">
      <div className="flex items-center gap-2"><Badge variant={item.severity === 'critical' ? 'danger' : item.severity === 'warning' ? 'warning' : 'info'}>{item.type}</Badge><span className="font-medium">{item.title}</span></div>
      <p className="text-sm text-muted-text mt-2 whitespace-pre-wrap break-words">{item.description}</p>
    </div>)}</CardContent>
  </Card>;
}

