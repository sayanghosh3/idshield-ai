import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Download, Search, Filter, Calendar, ChevronDown, Eye, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Table } from '../components/common/Table';
import { Input } from '../components/common/Input';
import { mockReports } from '../mocks/cases';
import { mockScreeningCases } from '../mocks/screeningData';
import { formatRelativeTime, formatDate, getRiskLevelColor, getRiskLevelLabel } from '../utils/formatters';
import { FadeIn, StaggerContainer } from '../components/animations';

export function Reports() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const filteredReports = mockReports.filter(report => {
    if (searchQuery && !report.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (typeFilter.length > 0 && !typeFilter.includes(report.type)) return false;
    if (statusFilter.length > 0 && !statusFilter.includes(report.status)) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text">Reports</h1>
            <p className="text-muted-text">Generate and manage screening reports</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setShowFilters(!showFilters)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Button variant="primary" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
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
                      placeholder="Search reports..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      label="Search"
                    />
                  </div>
                  <div>
                    <label className="label">Type</label>
                    <div className="flex flex-wrap gap-2">
                      {['screening', 'forensic', 'summary'].map(type => (
                        <label key={type} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={typeFilter.includes(type)}
                            onChange={e => setTypeFilter(prev => e.target.checked ? [...prev, type] : prev.filter(v => v !== type))}
                            className="rounded border-border text-primary-accent focus:ring-primary-accent"
                          />
                          <span className="text-sm capitalize">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <div className="flex flex-wrap gap-2">
                      {['ready', 'generating', 'failed'].map(status => (
                        <label key={status} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={statusFilter.includes(status)}
                            onChange={e => setStatusFilter(prev => e.target.checked ? [...prev, status] : prev.filter(v => v !== status))}
                            className="rounded border-border text-primary-accent focus:ring-primary-accent"
                          />
                          <span className="text-sm capitalize">{status}</span>
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
                { key: 'title', header: 'Report', className: 'font-medium', render: (row) => (
                  <div>
                    <p className="font-medium text-text">{row.title}</p>
                    <p className="text-xs text-muted-text">{row.caseId}</p>
                  </div>
                )},
                { key: 'type', header: 'Type', render: (row) => <Badge variant="info" size="sm">{row.type}</Badge> },
                { key: 'format', header: 'Format', render: (row) => <Badge variant="neutral" size="sm">{row.format.toUpperCase()}</Badge> },
                { key: 'status', header: 'Status', render: (row) => <Badge variant={row.status === 'ready' ? 'success' : row.status === 'generating' ? 'warning' : 'danger'} size="sm">{row.status}</Badge> },
                { key: 'generatedBy', header: 'Generated By' },
                { key: 'generatedAt', header: 'Date', render: (row) => formatDate(row.generatedAt) },
                { key: 'actions', header: 'Actions', render: (row) => (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><Download className="w-4 h-4" /></Button>
                  </div>
                )},
              ]}
              data={filteredReports}
              keyExtractor={row => row.id}
              striped
            />
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.2}>
        <StaggerContainer staggerChildren={0.08}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FadeIn y={16}>
              <Card padding="lg">
                <CardHeader>
                  <CardTitle>Generate New Report</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="label">Case</label>
                    <select className="input">
                      <option value="">Select a case...</option>
                      {mockScreeningCases.map(c => (
                        <option key={c.id} value={c.id}>{c.caseNumber} - {c.documents[0]?.name.replace('Passport_', '').replace('.pdf', '').replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Report Type</label>
                    <div className="flex gap-4">
                      {['screening', 'forensic', 'summary'].map((type: string) => (
                        <label key={type} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="reportType" value={type} className="text-primary-accent focus:ring-primary-accent" defaultChecked={type === 'screening'} />
                          <span className="text-sm capitalize">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">Format</label>
                    <div className="flex gap-4">
                      {['pdf', 'html'].map(format => (
                        <label key={format} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="format" value={format} className="text-primary-accent focus:ring-primary-accent" defaultChecked={format === 'pdf'} />
                          <span className="text-sm uppercase">{format}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <Button variant="primary" className="w-full" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Report
                  </Button>
                </CardContent>
              </Card>
            </FadeIn>

            <FadeIn y={16}>
              <Card padding="lg">
                <CardHeader>
                  <CardTitle>Report Templates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <StaggerContainer staggerChildren={0.05}>
                    {[
                      { name: 'Standard Screening Report', desc: 'Complete screening results with all analysis sections', icon: FileText },
                      { name: 'Forensic Analysis Report', desc: 'Detailed tampering and forensic findings with evidence', icon: AlertCircle },
                      { name: 'Executive Summary', desc: 'High-level overview for management briefings', icon: FileText },
                      { name: 'Audit Trail Report', desc: 'Complete audit log for compliance requirements', icon: FileText },
                    ].map((template, i) => (
                      <FadeIn key={i} y={4}>
                        <motion.div
                          className="flex items-center gap-4 p-3 bg-panel-secondary rounded-lg border border-border/50"
                          whileHover={{ x: 4 }}
                        >
                          <template.icon className="w-6 h-6 text-primary-accent" />
                          <div className="flex-1">
                            <p className="font-medium text-text">{template.name}</p>
                            <p className="text-sm text-muted-text">{template.desc}</p>
                          </div>
                          <Button variant="ghost" size="sm" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Use Template</Button>
                        </motion.div>
                      </FadeIn>
                    ))}
                  </StaggerContainer>
                </CardContent>
              </Card>
            </FadeIn>
          </div>
        </StaggerContainer>
      </FadeIn>
    </div>
  );
}