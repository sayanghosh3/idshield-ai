import type { DocumentFile } from '../../types';
import { FileText } from 'lucide-react';
export function DocumentPreview({ document, className = '' }: { document?: DocumentFile; className?: string }) {
  if (!document) return <p className="text-muted-text">No document supplied.</p>;
  if (!document.preview || document.preview.startsWith('/demo/')) return <div className={'bg-panel-secondary rounded-lg p-4 flex flex-col items-center justify-center text-center ' + className}>
    <FileText className="w-8 h-8 text-muted-text" />
    <span className="text-xs mt-2 break-words">{document.name}</span>
    <span className="text-xs text-muted-text">Sample input — illustration unavailable</span>
  </div>;
  if (document.type === 'application/pdf') return <object data={document.preview} type="application/pdf" className={className} aria-label={document.name}>
    <a href={document.preview} target="_blank" rel="noreferrer">Open {document.name}</a>
  </object>;
  return <img src={document.preview} alt={document.name} className={className} />;
}

