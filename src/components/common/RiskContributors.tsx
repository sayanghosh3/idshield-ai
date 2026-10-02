import type { RiskResult } from '../../types';
import { Badge } from './Badge';

export function RiskContributors({ result }: { result: RiskResult }) {
  const contributors = [...result.contributors].sort((a, b) => b.impact - a.impact);
  const maximum = Math.max(1, ...contributors.map(item => Math.abs(item.impact)));
  return <div className="space-y-3">
    <h3 className="font-semibold">Why was this case flagged?</h3>
    <p className="text-sm text-muted-text">Engine-reported contributor impacts. These are not probabilities and may not sum to the overall score.</p>
    {contributors.map(item => <div key={item.id} className="p-3 rounded-lg bg-panel-secondary">
      <div className="flex justify-between gap-3"><span>{item.factor}</span><Badge variant={item.type === 'negative' ? 'danger' : 'success'}>{item.impact > 0 ? '+' : ''}{item.impact} impact</Badge></div>
      <p className="text-sm text-muted-text my-2">{item.description}</p>
      <p className="text-xs text-muted-text">{item.category} · {item.type === 'negative' ? 'Adverse finding' : 'Supporting finding'}</p>
      <div aria-hidden="true" className="h-2 bg-panel rounded-full overflow-hidden mt-2"><div className={item.type === 'negative' ? 'h-full bg-danger' : 'h-full bg-success'} style={{ width: `${Math.abs(item.impact) / maximum * 100}%` }} /></div>
    </div>)}
    {result.explanation.map((line, index) => <p key={index} className="text-sm">{line}</p>)}
  </div>;
}
