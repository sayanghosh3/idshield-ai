import { useCases } from '../hooks/useCases';
import type { CaseStatus } from '../types/case';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Minus, Users, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../utils/cn';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Table } from '../components/common/Table';

import { formatRelativeTime, getRiskLevelColor, getRiskLevelLabel, formatScore } from '../utils/formatters';
import { StaggerContainer, FadeIn, AnimatedCard } from '../components/animations';

const caseStatusVariants = {
  closed: 'success',
  archived: 'neutral',
  under_review: 'warning',
  escalated: 'danger',
  open: 'info',
} as const satisfies Record<CaseStatus, 'success' | 'neutral' | 'warning' | 'danger' | 'info'>;

const kpiTemplates = [
  {
    title: "Today's Screenings",
    value: '127',
    change: '+12%',
    trend: 'up',
    icon: Users,
    color: 'text-primary-accent',
    bg: 'bg-primary-accent/20',
  },
  {
    title: 'High Risk',
    value: '8',
    change: '+3',
    trend: 'up',
    icon: AlertTriangle,
    color: 'text-danger',
    bg: 'bg-danger/20',
  },
  {
    title: 'Review Required',
    value: '19',
    change: '-2',
    trend: 'down',
    icon: Clock,
    color: 'text-warning',
    bg: 'bg-warning/20',
  },
  {
    title: 'Low Risk',
    value: '100',
    change: '+11',
    trend: 'up',
    icon: CheckCircle,
    color: 'text-success',
    bg: 'bg-success/20',
  },
];



export function Dashboard() {
  const navigate = useNavigate();
  const { listItems } = useCases();
  const recentCases = listItems.slice(0, 5);
  const counts = [listItems.length, listItems.filter(item => item.riskLevel === 'high').length,
    listItems.filter(item => item.status === 'under_review').length, listItems.filter(item => item.riskLevel === 'low').length];
  const kpiCards = kpiTemplates.map((card, index) => ({ ...card, value: String(counts[index]),
    title: index === 0 ? 'Cases in this session' : index === 2 ? 'Awaiting Review' : card.title,
    change: 'Demo records', trend: 'neutral' }));
  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text">Security Screening Dashboard</h1>
            <p className="text-muted-text mt-1">AI-assisted identity and document screening</p>
          </div>
          <Link to="/screening" className="btn-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Screening
          </Link>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <StaggerContainer staggerChildren={0.08} delayChildren={0.1}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((kpi, index) => {
              const Icon = kpi.icon;
              const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus;
              return (
                <AnimatedCard key={index} padding="md">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-text">{kpi.title}</p>
                      <p className="text-3xl font-bold text-text mt-1">{kpi.value}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={cn('text-sm font-medium', kpi.trend === 'up' && 'text-success', kpi.trend === 'down' && 'text-danger', kpi.trend === 'neutral' && 'text-muted-text')}>
                          <TrendIcon className="w-4 h-4 inline" /> {kpi.change}
                        </span>
                        <span className="text-xs text-muted-text">in this session</span>
                      </div>
                    </div>
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', kpi.bg)}>
                      <Icon className={cn('w-6 h-6', kpi.color)} />
                    </div>
                  </div>
                </AnimatedCard>
              );
            })}
          </div>
        </StaggerContainer>
      </FadeIn>

      <FadeIn delay={0.2}>
        <Card padding="none">
          <CardHeader className="p-6">
            <CardTitle>Recent Screening Cases</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table
              columns={[
                { key: 'caseNumber', header: 'Case ID', className: 'font-mono font-medium' },
                { key: 'documentType', header: 'Document' },
                { key: 'subjectName', header: 'Person' },
                { key: 'riskScore', header: 'Risk Score', render: (row) => (
                  <div className="flex items-center gap-2">
                    <span className={cn('font-mono font-medium', getRiskLevelColor(row.riskLevel))}>{formatScore(row.riskScore)}</span>
                    <Badge variant={row.riskLevel === 'high' ? 'danger' : row.riskLevel === 'review' ? 'warning' : row.riskLevel === 'low' ? 'success' : 'neutral'} size="sm">
                      {getRiskLevelLabel(row.riskLevel)}
                    </Badge>
                  </div>
                )},
                { key: 'status', header: 'Status', render: (row) => <Badge variant={caseStatusVariants[row.status]}>{row.status.replace('_', ' ')}</Badge> },
                { key: 'createdAt', header: 'Time', render: (row) => formatRelativeTime(row.createdAt) },
                { key: 'action', header: 'Action', render: (row) => (
                  <Link to={`/cases/${row.id}`} className="text-primary-accent hover:underline text-sm font-medium">Open</Link>
                )},
              ]}
              data={recentCases}
              keyExtractor={row => row.id}
              clickable
              onRowClick={row => navigate(`/cases/${row.id}`)}
              striped
            />
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.3}>
        <Card padding="md">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <StaggerContainer staggerChildren={0.06} delayChildren={0.1}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { name: 'OCR Engine', status: 'operational', version: 'v2.3.1' },
                  { name: 'Validation Service', status: 'operational', version: 'v3.0.0' },
                  { name: 'Forensic Analyzer', status: 'operational', version: 'v1.5.2' },
                  { name: 'Face Matcher', status: 'operational', version: 'v2.1.0' },
                ].map((service, i) => (
                  <FadeIn key={i} delay={i * 0.06}>
                    <div className="flex items-center justify-between p-4 bg-panel-secondary rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-success" />
                        <div>
                          <p className="font-medium text-text">{service.name}</p>
                          <p className="text-xs text-muted-text">{service.version}</p>
                        </div>
                      </div>
                      <Badge variant="success" size="sm">{service.status}</Badge>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </StaggerContainer>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
