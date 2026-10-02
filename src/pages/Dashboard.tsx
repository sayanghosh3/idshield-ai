import { AnalysisServices } from '../components/common/AnalysisServices';
import { useCases } from '../hooks/useCases';
import { caseStatusVariants } from '../utils/casePresentation';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Users, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../utils/cn';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Table } from '../components/common/Table';

import { formatRelativeTime, getRiskLevelColor, getRiskLevelLabel, formatScore } from '../utils/formatters';
import { StaggerContainer, FadeIn, AnimatedCard } from '../components/animations';

const kpiTemplates = [
  { title: 'Cases in this session', icon: Users, color: 'text-primary-accent', bg: 'bg-primary-accent/20' },
  { title: 'High Risk', icon: AlertTriangle, color: 'text-danger', bg: 'bg-danger/20' },
  { title: 'Moderate Risk', icon: Clock, color: 'text-warning', bg: 'bg-warning/20' },
  { title: 'Low Risk', icon: CheckCircle, color: 'text-success', bg: 'bg-success/20' },
  { title: 'Awaiting Review', icon: Clock, color: 'text-primary-accent', bg: 'bg-primary-accent/20' },
];



export function Dashboard() {
  const navigate = useNavigate();
  const { listItems } = useCases();
  const recentCases = listItems.slice(0, 5);
  const counts = [listItems.length, listItems.filter(item => item.riskLevel === 'high').length,
    listItems.filter(item => item.riskLevel === 'review').length, listItems.filter(item => item.riskLevel === 'low').length,
    listItems.filter(item => item.status === 'under_review').length];
  const kpiCards = kpiTemplates.map((card, index) => ({ ...card, value: String(counts[index]),
    title: card.title,
    change: 'Session data (includes demo)' , trend: 'neutral' }));
  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-text">IDShield AI</h1>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
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
                { key: 'mode', header: 'Mode', render: (row) => <Badge variant={row.tags.includes('real-analysis') ? 'info' : 'warning'}>{row.tags.includes('real-analysis') ? 'LIVE' : 'DEMO / SAMPLE'}</Badge> },
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

      <AnalysisServices />
    </div>
  );
}
