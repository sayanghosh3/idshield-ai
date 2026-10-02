import { useBackendHealth } from '../../hooks/useBackendHealth';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { Badge } from './Badge';

export function AnalysisServices() {
  const health = useBackendHealth();
  return <Card padding="md">
    <CardHeader><CardTitle>Analysis Services — Backend {health.status}</CardTitle></CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries({ ocr: 'OCR Engine', validation: 'Validation / MRZ', forensics: 'Document Forensics', face: 'Face Verification', risk: 'Risk Engine', government: 'Government DB / Watchlist', liveness: 'Liveness / Anti-Spoofing' }).map(([key, label]) => {
          const status = key === 'government' ? 'NOT CONNECTED' : key === 'liveness' ? 'NOT IMPLEMENTED' : health.modules[key]?.status ?? health.status;
          return <div key={key} className="bg-panel-secondary rounded-lg p-3 space-y-2">
            <p className="font-medium">{label}</p><Badge variant={status === 'LIVE' ? 'success' : 'warning'}>{status}</Badge>
            <p className="text-xs text-muted-text">{health.modules[key]?.detail}</p>
          </div>;
        })}
      </div>
      <p className="text-sm text-muted-text mt-3">Demo / sample scenarios work without a backend. Availability does not certify an analysis result. Checked at most once per minute while visible.</p>
    </CardContent>
  </Card>;
}
