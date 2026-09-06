import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Minus, Users, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../utils/cn';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Table } from '../components/common/Table';
import { mockScreeningCases } from '../mocks/screeningData';
import { formatRelativeTime, getRiskLevelColor, getRiskLevelLabel, formatScore } from '../utils/formatters';
import { StaggerContainer, FadeIn, AnimatedCard } from '../components/animations';

const kpiCards = [
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

const recentCases = mockScreeningCases.slice(0, 5);

export function Dashboard() {
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
                        <span className="text-xs text-muted-text">vs last week</span>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2" padding="none">
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
                      <Badge variant={row.riskLevel === 'high' ? 'danger' : row.riskLevel === 'review' ? 'warning' : 'success'} size="sm">
                        {getRiskLevelLabel(row.riskLevel)}
                      </Badge>
                    </div>
                  )},
                  { key: 'status', header: 'Status', render: (row) => <Badge variant={row.status === 'failed' ? 'danger' : row.status === 'completed' ? 'success' : row.status === 'processing' ? 'warning' : 'info'}>{row.status.replace('_', ' ')}</Badge> },
                  { key: 'createdAt', header: 'Time', render: (row) => formatRelativeTime(row.createdAt) },
                  { key: 'action', header: 'Action', render: (row) => (
                    <Link to={`/cases/${row.id}`} className="text-primary-accent hover:underline text-sm font-medium">Open</Link>
                  )},
                ]}
                data={recentCases}
                keyExtractor={row => row.id}
                clickable
                onRowClick={row => window.location.href = `/cases/${row.id}`}
                striped
              />
            </CardContent>
          </Card>

          <Card padding="md">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/screening" className="btn-secondary w-full justify-start gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                <span>Start New Screening</span>
              </Link>
              <Link to="/cases" className="btn-secondary w-full justify-start gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <span>View All Cases</span>
              </Link>
              <Link to="/reports" className="btn-secondary w-full justify-start gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <span>Generate Reports</span>
              </Link>
              <Link to="/audit" className="btn-secondary w-full justify-start gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                <span>Audit Log</span>
              </Link>
              <Link to="/settings" className="btn-secondary w-full justify-start gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span>Settings</span>
              </Link>
            </CardContent>
          </Card>
        </div>
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