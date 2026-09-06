import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, ChevronDown, Download, FileText } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Table } from '../components/common/Table';
import { Input } from '../components/common/Input';
import { mockCases, caseStatusOptions, riskLevelOptions } from '../mocks/cases';
import { formatRelativeTime, getRiskLevelColor, getRiskLevelLabel, formatScore } from '../utils/formatters';

export function Cases() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [riskFilter, setRiskFilter] = useState<string[]>([]);
  const [sortField, setSortField] = useState<'createdAt' | 'riskScore' | 'caseNumber'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  const filteredCases = useMemo(() => {
    let result = [...mockCases];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.caseNumber.toLowerCase().includes(query) ||
        c.subjectName.toLowerCase().includes(query)
      );
    }

    if (statusFilter.length > 0) {
      result = result.filter(c => statusFilter.includes(c.status));
    }

    if (riskFilter.length > 0) {
      result = result.filter(c => riskFilter.includes(c.riskLevel));
    }

    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [searchQuery, statusFilter, riskFilter, sortField, sortDirection]);

  const handleSort = (field: 'createdAt' | 'riskScore' | 'caseNumber') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getStatusConfig = (status: string) => caseStatusOptions.find(s => s.value === status) || { color: '' };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Cases</h1>
          <p className="text-muted-text">Manage and review screening cases</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button variant="primary">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card padding="md" className="animate-slide-up">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search cases, names, passport numbers..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                label="Search"
              />
            </div>
            <div>
              <label className="label">Status</label>
              <div className="flex flex-wrap gap-2">
                {caseStatusOptions.map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={statusFilter.includes(opt.value)}
                      onChange={e => setStatusFilter(prev => e.target.checked ? [...prev, opt.value] : prev.filter(v => v !== opt.value))}
                      className="rounded border-border text-primary-accent focus:ring-primary-accent"
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Risk Level</label>
              <div className="flex flex-wrap gap-2">
                {riskLevelOptions.map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={riskFilter.includes(opt.value)}
                      onChange={e => setRiskFilter(prev => e.target.checked ? [...prev, opt.value] : prev.filter(v => v !== opt.value))}
                      className="rounded border-border text-primary-accent focus:ring-primary-accent"
                    />
                    <Badge variant={opt.value === 'high' ? 'danger' : opt.value === 'review' ? 'warning' : 'success'} size="sm">
                      {opt.label}
                    </Badge>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card padding="none">
        <CardContent className="p-0">
          <Table
            columns={[
              { key: 'caseNumber', header: 'Case ID', className: 'font-mono font-medium', render: (row) => <Link to={`/cases/${row.id}`} className="text-primary-accent hover:underline">{row.caseNumber}</Link> },
              { key: 'subjectName', header: 'Name' },
              { key: 'documentType', header: 'Document' },
              { key: 'riskScore', header: 'Risk', render: (row) => (
                <div className="flex items-center gap-2">
                  <span className={cn('font-mono font-medium', getRiskLevelColor(row.riskLevel))}>{formatScore(row.riskScore)}</span>
                  <Badge variant={row.riskLevel === 'high' ? 'danger' : row.riskLevel === 'review' ? 'warning' : 'success'} size="sm">
                    {getRiskLevelLabel(row.riskLevel)}
                  </Badge>
                </div>
              )},
              { key: 'status', header: 'Status', render: (row) => {
                const config = getStatusConfig(row.status);
                return <Badge variant="neutral" className={config.color}>{row.status.replace('_', ' ')}</Badge>;
              }},
              { key: 'createdAt', header: 'Created', render: (row) => formatRelativeTime(row.createdAt) },
              { key: 'actions', header: 'Actions', render: (row) => (
                <div className="flex items-center gap-2">
                  <Link to={`/cases/${row.id}`} className="btn-secondary text-sm">Open</Link>
                  <Button variant="ghost" size="sm" className="text-sm">
                    <FileText className="w-4 h-4" />
                  </Button>
                </div>
              )},
            ]}
            data={filteredCases}
            keyExtractor={row => row.id}
            clickable
            onRowClick={row => window.location.href = `/cases/${row.id}`}
            striped
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-text">
        <span>Showing {filteredCases.length} of {mockCases.length} cases</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" disabled>Previous</Button>
          <Button variant="ghost" size="sm" disabled>Next</Button>
        </div>
      </div>
    </div>
  );
}