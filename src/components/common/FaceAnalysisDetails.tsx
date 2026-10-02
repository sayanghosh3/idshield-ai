import type { ScreeningCase } from '../../types';
import { DocumentPreview } from './DocumentPreview';

export function FaceAnalysisDetails({ record }: { record: ScreeningCase }) {
  const face = record.faceResult;
  if (!face) return <p>Face verification not checked.</p>;
  const live = record.tags.includes('real-analysis');
  return <div className="space-y-3 mb-4">
    <div className="grid grid-cols-2 gap-4">
      <div><p>Document image</p><DocumentPreview document={record.documents[0]} className="w-full h-48 object-contain" /></div>
      <div><p>Presented / selfie image</p><DocumentPreview document={record.selfie} className="w-full h-48 object-contain" /></div>
    </div>
    <p>{live ? `Model: ${face.model ?? 'Not reported'} · Detector: ${face.detector ?? 'Not reported'}` : 'DEMO DATA — SIMULATED FACE COMPARISON'}</p>
    {live && <p className="text-sm">Distance: {face.distance ?? 'Not reported'} · Distance threshold: {face.threshold} · Processing: {face.analysisTime.toFixed(2)} s</p>}
    <p className="font-semibold">{live ? 'LIVENESS NOT CHECKED' : `SIMULATED LIVENESS: ${face.presentedFace.livenessStatus.toUpperCase()}`}</p>
    <p className="text-sm text-muted-text">No active anti-spoofing. Similarity is a score, not a probability of identity. {live && 'Face quality is not measured by this endpoint.'}</p>
  </div>;
}
