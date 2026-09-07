import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../utils/cn';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Table } from '../components/common/Table';
import { mockCases, caseStatusOptions } from '../mocks/cases';
import { CaseListItem } from '../types/case';
import { getRiskLevelColor, getRiskLevelLabel, formatScore, formatDateTime } from '../utils/formatters';
import { FadeIn, StaggerContainer, AnimatedStatus } from '../components/animations';

const riskGroupOrder = { high: 0, review: 1, low: 2 };
const riskGroupLabels: Record<string, string> = {
  high: 'High Risk',
  review: 'Moderate Risk',
  low: 'Low Risk',
};

const riskGroupIcons: Record<string, React.ReactNode> = {
  high: <AlertTriangle className="w-5 h-5 text-danger" />,
  review: <AlertTriangle className="w-5 h-5 text-warning" />,
  low: <AlertTriangle className="w-5 h-5 text-success" />,
};

function mapCaseStatusToAnimatedStatus(status: string): 'completed' | 'processing' | 'pending' | 'failed' {
  switch (status) {
    case 'closed':
      return 'completed';
    case 'archived':
      return 'completed';
    case 'under_review':
      return 'pending';
    case 'open':
      return 'pending';
    case 'escalated':
      return 'pending';
    default:
      return 'pending';
  }
}

function getStatusConfig(status: string) {
  return caseStatusOptions.find(s => s.value === status) || { color: '', label: status };
}

export function RiskCases() {
  const navigate = useNavigate();

  const sortedCases = [...mockCases].sort((a, b) => {
    const groupDiff = riskGroupOrder[a.riskLevel as keyof typeof riskGroupOrder] - riskGroupOrder[b.riskLevel as keyof typeof riskGroupOrder];
    if (groupDiff !== 0) return groupDiff;
    return b.riskScore - a.riskScore;
  });

  const groupedCases = sortedCases.reduce((acc, caseItem) => {
    const group = caseItem.riskLevel;
    if (!acc[group]) acc[group] = [];
    acc[group].push(caseItem);
    return acc;
  }, {} as Record<string, CaseListItem[]>);

  const riskGroups = ['high', 'review', 'low'] as const;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text">Risk Cases</h1>
            <p className="text-muted-text">All cases grouped by risk level, sorted by risk score</p>
          </div>
        </div>
      </FadeIn>

      {riskGroups.map((group, groupIndex) => {
        const cases = groupedCases[group] || [];
        if (cases.length === 0) return null;

        return (
          <FadeIn key={group} delay={groupIndex * 0.1}>
            <Card padding="none">
              <CardHeader className="p-6 border-b border-border/50">
                <div className="flex items-center gap-3">
                  {riskGroupIcons[group]}
                  <div>
                    <CardTitle className="text-lg">{riskGroupLabels[group]}</CardTitle>
                    <p className="text-sm text-muted-text">{cases.length} case{cases.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <StaggerContainer staggerChildren={0.05} delayChildren={0.05}>
                  <Table
                    columns={[
                      { key: 'caseNumber', header: 'Case ID', className: 'font-mono font-medium', render: (row) => <Link to={`/cases/${row.id}`} className="text-primary-accent hover:underline">{row.caseNumber}</Link> },
                      { key: 'subjectName', header: 'Subject Name' },
                      { key: 'documentType', header: 'Document Type' },
                      { key: 'riskScore', header: 'Risk Score', render: (row) => (
                        <div className="flex items-center gap-2">
                          <span className={cn('font-mono font-medium', getRiskLevelColor(row.riskLevel))}>{formatScore(row.riskScore)}</span>
                          <Badge variant={row.riskLevel === 'high' ? 'danger' : row.riskLevel === 'review' ? 'warning' : 'success'} size="sm">
                            {getRiskLevelLabel(row.riskLevel)}
                          </Badge>
                        </div>
                      )},
                      { key: 'status', header: 'Status', render: (row) => {
                        const config = getStatusConfig(row.status);
                        const animatedStatus = mapCaseStatusToAnimatedStatus(row.status);
                        return (
                          <AnimatedStatus status={animatedStatus} className={config.color}>
                            {config.label || row.status.replace('_', ' ')}
                          </AnimatedStatus>
                        );
                      }},
                      { key: 'createdAt', header: 'Created', render: (row) => formatDateTime(row.createdAt) },
                      { key: 'actions', header: 'Action', render: (row) => (
                        <Link to={`/cases/${row.id}`} className="btn-secondary text-sm" onClick={() => navigate(`/cases/${row.id}`)}>
                          Open
                        </Link>
                      )},
                    ]}
                    data={cases}
                    keyExtractor={row => row.id}
                    clickable
                    onRowClick={(row) => navigate(`/cases/${row.id}`)}
                    striped
                  />
                </StaggerContainer>
              </CardContent>
            </Card>
          </FadeIn>
        );
      })}

      <FadeIn delay={0.3}>
        <div className="flex items-center justify-between text-sm text-muted-text">
          <span>Total: {mockCases.length} cases</span>
        </div>
      </FadeIn>
    </div>
  );
}