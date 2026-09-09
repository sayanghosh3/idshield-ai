import { useMemo } from 'react';
import { groupRiskCases, caseStatusVariants } from '../utils/casePresentation';
import { useCases } from '../hooks/useCases';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../utils/cn';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Table } from '../components/common/Table';
import { caseStatusOptions } from '../mocks/cases';
import { getRiskLevelColor, getRiskLevelLabel, formatScore, formatDateTime } from '../utils/formatters';
import { FadeIn, StaggerContainer } from '../components/animations';

const riskGroupLabels: Record<string, string> = {
  high: 'High Risk',
  review: 'Moderate Risk',
  low: 'Low Risk',
  unknown: 'Not Assessed',
};

const riskGroupIcons: Record<string, React.ReactNode> = {
  high: <AlertTriangle className="w-5 h-5 text-danger" />,
  review: <AlertTriangle className="w-5 h-5 text-warning" />,
  low: <AlertTriangle className="w-5 h-5 text-success" />,
  unknown: <AlertTriangle className="w-5 h-5 text-muted-text" />,
};


function getStatusConfig(status: string) {
  return caseStatusOptions.find(s => s.value === status) || { color: '', label: status };
}

export function RiskCases() {
  const { listItems: mockCases } = useCases();
  const navigate = useNavigate();

  const groupedCases = useMemo(() => groupRiskCases(mockCases), [mockCases]);

  const riskGroups = ['high', 'review', 'low', 'unknown'] as const;

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
                          <Badge variant={row.riskLevel === 'high' ? 'danger' : row.riskLevel === 'review' ? 'warning' : row.riskLevel === 'low' ? 'success' : 'neutral'} size="sm">
                            {getRiskLevelLabel(row.riskLevel)}
                          </Badge>
                        </div>
                      )},
                      { key: 'status', header: 'Status', render: (row) => {
                        const config = getStatusConfig(row.status);
                        return (
                          <Badge variant={caseStatusVariants[row.status]}>
                            {config.label || row.status.replace('_', ' ')}
                          </Badge>
                        );
                      }},
                      { key: 'createdAt', header: 'Created', render: (row) => formatDateTime(row.createdAt) },
                      { key: 'actions', header: 'Action', render: (row) => (
                        <Link to={`/cases/${row.id}`} className="btn-secondary text-sm">
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
