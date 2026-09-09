import { caseStatusVariants } from '../utils/casePresentation';
import { useCases } from '../hooks/useCases';
import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, FileText } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from '../components/common/Button';
import { Card, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Table } from '../components/common/Table';
import { Input } from '../components/common/Input';
import { caseStatusOptions, riskLevelOptions } from '../mocks/cases';
import { formatRelativeTime, getRiskLevelColor, getRiskLevelLabel, formatScore } from '../utils/formatters';
import { FadeIn } from '../components/animations';

export function Cases() {
  const { listItems: mockCases } = useCases();
  const navigate = useNavigate();
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
      const aVal = a[sortField] ?? -1;
      const bVal = b[sortField] ?? -1;
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [mockCases, searchQuery, statusFilter, riskFilter, sortField, sortDirection]);

  const handleSort = (field: 'createdAt' | 'riskScore' | 'caseNumber') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };


  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text">Cases</h1>
            <p className="text-muted-text">Manage and review screening cases</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Link to="/reports" className="btn-primary">Reports / Export</Link>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <AnimatePresence mode="wait">
          {showFilters && (
            <motion.div
              key="filters"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card padding="md">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search case ID or subject name…"
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
            </motion.div>
          )}
        </AnimatePresence>
      </FadeIn>

      <FadeIn delay={0.15}>
        <Card padding="none">
          <CardContent className="p-0">
            <Table
              columns={[
                { key: 'caseNumber', sortable: true, header: 'Case ID', className: 'font-mono font-medium', render: (row) => <Link to={`/cases/${row.id}`} className="text-primary-accent hover:underline">{row.caseNumber}</Link> },
                { key: 'subjectName', header: 'Name' },
                { key: 'documentType', header: 'Document' },
                { key: 'riskScore', sortable: true, header: 'Risk', render: (row) => (
                  <div className="flex items-center gap-2">
                    <span className={cn('font-mono font-medium', getRiskLevelColor(row.riskLevel))}>{formatScore(row.riskScore)}</span>
                    <Badge variant={row.riskLevel === 'high' ? 'danger' : row.riskLevel === 'review' ? 'warning' : row.riskLevel === 'low' ? 'success' : 'neutral'} size="sm">
                      {getRiskLevelLabel(row.riskLevel)}
                    </Badge>
                  </div>
                )},
                { key: 'status', header: 'Status', render: (row) => {
                  return <Badge variant={caseStatusVariants[row.status]}>{row.status.replace('_', ' ')}</Badge>;
                }},
                { key: 'createdAt', sortable: true, header: 'Created', render: (row) => formatRelativeTime(row.createdAt) },
                { key: 'actions', header: 'Actions', render: (row) => (
                  <div className="flex items-center gap-2">
                    <Link to={`/cases/${row.id}`} className="btn-secondary text-sm">Open</Link>
                    <Link to={`/reports?caseId=${row.id}`} className="text-primary-accent" aria-label={`Report for ${row.caseNumber}`}><FileText className="w-4 h-4" /></Link>
                  </div>
                )},
              ]}
              sortBy={sortField}
              sortDirection={sortDirection}
              onSort={key => { if (key === 'createdAt' || key === 'riskScore' || key === 'caseNumber') handleSort(key); }}
              emptyMessage="No cases match these filters. Adjust the search or clear the selected filters."
              data={filteredCases}
              keyExtractor={row => row.id}
              clickable
              onRowClick={(row) => navigate(`/cases/${row.id}`)}
              striped
            />
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.2}>
        <div className="flex items-center justify-between text-sm text-muted-text">
          <span>Showing {filteredCases.length} of {mockCases.length} cases</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" disabled>Previous</Button>
            <Button variant="ghost" size="sm" disabled>Next</Button>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
