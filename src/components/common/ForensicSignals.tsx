import type { TamperingResult } from '../../types';

export function ForensicSignals({ result }: { result?: TamperingResult }) {
  if (!result) return <p>Forensics not checked.</p>;
  const raw = result.raw;
  return <div className="space-y-3 mb-4">
    <p className="font-semibold">Forensic score: {result.overallScore} / 100 · {result.overallStatus}</p>
    <p className="text-sm text-muted-text">ELA and other forensic indicators are not standalone proof of fraud. No generated heatmap is available.</p>
    {raw && <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{Object.entries(raw.signals).map(([name, values]) => <div key={name} className="p-3 bg-panel-secondary rounded-lg">
        <h4 className="font-medium uppercase">{name}</h4>
        <dl>{Object.entries(values).map(([key, value]) => <div key={key} className="flex justify-between gap-2 text-sm"><dt>{key}</dt><dd>{Number(value).toFixed(3)}</dd></div>)}</dl>
      </div>)}</div>
      <p className="text-sm">Sharpness: {raw.quality.sharpness.toFixed(2)} ({raw.quality.sharpnessStatus}) · Entropy: {raw.quality.entropy.toFixed(2)} ({raw.quality.entropyStatus})</p>
      <p className="text-sm">Metadata: {raw.metadata.format} · {raw.metadata.mode} · {raw.metadata.size.width} × {raw.metadata.size.height} · EXIF entries: {raw.metadata.exifCount}</p>
      <p className="text-xs text-muted-text">{raw.method} · {raw.processingTime.toFixed(2)} s · Analysis {raw.analysisId}</p>
    </>}
  </div>;
}
