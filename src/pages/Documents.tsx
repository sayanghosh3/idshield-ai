import { useState } from 'react';
import { FileText, Image, Search, Filter, ChevronDown, Eye, Download, Trash2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Table } from '../components/common/Table';
import { Input } from '../components/common/Input';
import { demoDocuments } from '../mocks/documents';
import { formatFileSize, formatRelativeTime } from '../utils/formatters';

const allDocuments = Object.values(demoDocuments);

export function Documents() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const documentTypes = [...new Set(allDocuments.map(d => d.documentType))];

  const filteredDocuments = allDocuments.filter(doc => {
    if (searchQuery && !doc.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (typeFilter.length > 0 && !typeFilter.includes(doc.documentType)) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Document Analysis</h1>
          <p className="text-muted-text">Browse and analyze uploaded documents</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border border-border rounded-lg p-1">
            <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('table')}>
              <FileText className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('grid')}>
              <Image className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card padding="md">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              label="Search"
            />
          </div>
          <div>
            <label className="label">Type</label>
            <div className="flex flex-wrap gap-2">
              {documentTypes.map(type => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={typeFilter.includes(type)}
                    onChange={e => setTypeFilter(prev => e.target.checked ? [...prev, type] : prev.filter(v => v !== type))}
                    className="rounded border-border text-primary-accent focus:ring-primary-accent"
                  />
                  <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {viewMode === 'table' ? (
        <Card padding="none">
          <CardContent className="p-0">
            <Table
              columns={[
                { key: 'preview', header: '', render: (row) => <img src={row.preview} alt={row.name} className="w-12 h-8 rounded object-cover" /> },
                { key: 'name', header: 'File Name', className: 'font-medium' },
                { key: 'documentType', header: 'Type', render: (row) => <Badge variant="info" size="sm">{row.documentType.replace('_', ' ')}</Badge> },
                { key: 'size', header: 'Size', render: (row) => formatFileSize(row.size) },
                { key: 'uploadedAt', header: 'Uploaded', render: (row) => formatRelativeTime(row.uploadedAt) },
                { key: 'actions', header: 'Actions', render: (row) => (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm"><Download className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" className="text-danger"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                )},
              ]}
              data={filteredDocuments}
              keyExtractor={row => row.id}
              striped
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocuments.map(doc => (
            <Card key={doc.id} padding="md" className="flex flex-col">
              <div className="aspect-video bg-panel-secondary rounded-lg overflow-hidden mb-3 relative">
                <img src={doc.preview} alt={doc.name} className="w-full h-full object-cover" />
                <Badge variant="info" className="absolute top-2 right-2">{doc.documentType.replace('_', ' ')}</Badge>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text truncate mb-1">{doc.name}</p>
                <p className="text-xs text-muted-text">{formatFileSize(doc.size)} • {formatRelativeTime(doc.uploadedAt)}</p>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                <Button variant="ghost" size="sm" className="flex-1"><Eye className="w-4 h-4 mr-1" /> View</Button>
                <Button variant="ghost" size="sm"><Download className="w-4 h-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}