import { useCases } from '../hooks/useCases';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Tabs, TabsList, TabTrigger, TabContent } from '../components/common/Tabs';
import { IncompleteCase } from '../components/common/IncompleteCase';
import { hasCompleteResult, analysisStatuses } from '../utils/screeningStatus';
import { formatRelativeTime, getRiskLevelColor, getRiskLevelLabel, formatScore } from '../utils/formatters';

export function ScreeningResult() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { cases } = useCases();
  const caseData = cases.find(c => c.id === caseId || c.caseNumber === caseId);
  if (!caseData || !hasCompleteResult(caseData)) return <IncompleteCase record={caseData} />;
  const outcomes = analysisStatuses(caseData);
  const riskColor = caseData.riskLevel === 'high' ? '#EF4444' : caseData.riskLevel === 'review' ? '#F59E0B' : '#22C55E';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-text">Screening Result</h1>
          <p className="text-muted-text">AI-assisted identity and document screening outcome</p>
        </div>
      </div>

      <Card padding="lg" className="border-2" style={{ borderColor: riskColor }}>
        <CardContent className="pt-0">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-muted-text">SCREENING RESULT</span>
                <Badge variant={caseData.riskLevel === 'high' ? 'danger' : caseData.riskLevel === 'review' ? 'warning' : 'success'} size="md">
                  {caseData.riskLevel.toUpperCase()} RISK
                </Badge>
              </div>
              <p className="text-lg font-mono text-text">Case ID: {caseData.caseNumber}</p>
              <p className="text-sm text-muted-text mt-1">Created: {formatRelativeTime(caseData.createdAt)}</p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold" style={{ color: riskColor }}>{caseData.riskScore}</div>
              <div className="text-muted-text">/ 100</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'OCR', status: outcomes.ocr, icon: FileText },
              { label: 'Validation', status: outcomes.validation, icon: CheckCircle },
              { label: 'Tampering', status: outcomes.tampering, icon: AlertTriangle },
              { label: 'Face', status: outcomes.face, icon: Shield },
              { label: 'Database', status: 'backend_required', icon: Shield },
            ].map((item, i) => (
              <div key={i} className="bg-panel-secondary rounded-lg p-4 text-center">
                <item.icon className="w-6 h-6 mx-auto mb-2 text-primary-accent" />
                <p className="font-medium text-text">{item.label}</p>
                <Badge variant={
                  item.status === 'completed' || item.status === 'pass' ? 'success' :
                  item.status === 'warning' ? 'warning' :
                  item.status === 'fail' ? 'danger' : 'info'
                } size="sm">{item.status.replace('_', ' ').toUpperCase()}</Badge>
              </div>
            ))}
          </div>

          <div className={cn('p-4 rounded-lg text-center', caseData.riskResult?.recommendation === 'clear' ? 'bg-success/20' : caseData.riskResult?.recommendation === 'secondary_inspection' ? 'bg-warning/20' : 'bg-danger/20')}>
            <p className="font-medium text-lg">Recommended Action:</p>
            <p className="text-xl font-bold mt-1" style={{ color: riskColor }}>
              {caseData.riskResult?.recommendation?.replace('_', ' ').toUpperCase() || 'SECONDARY INSPECTION'}
            </p>
            <p className="text-sm text-muted-text mt-2">
              This is an AI-assisted recommendation. Final determination requires human operator review.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card padding="lg">
        <CardHeader>
          <CardTitle>Evidence & Findings</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" variant="line">
            <TabsList>
              {['Overview', 'Original', 'OCR', 'Validation', 'Tampering', 'Face', 'Metadata'].map(tab => (
                <TabTrigger key={tab.toLowerCase()} value={tab.toLowerCase()}>{tab}</TabTrigger>
              ))}
            </TabsList>
            <TabContent value="overview">
              <div className="space-y-3">
                {caseData.riskResult?.explanation?.map((exp: string, i: number) => (
                  <div key={i} className="p-3 bg-panel-secondary rounded-lg border border-border/50 flex items-start gap-3">
                    <span className="text-primary-accent font-mono mt-0.5">{i + 1}.</span>
                    <p className="text-text flex-1">{exp}</p>
                  </div>
                ))}
              </div>
            </TabContent>
            <TabContent value="original">
              <div className="text-center py-8 text-muted-text">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Original document view would be displayed here</p>
              </div>
            </TabContent>
            <TabContent value="ocr">
              <div className="space-y-3">
                {caseData.ocrResult?.extractedFields?.map((field: any) => (
                  <div key={field.key} className="bg-panel-secondary rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-text">{field.label}</span>
                      <Badge variant={field.confidence > 90 ? 'success' : field.confidence > 70 ? 'warning' : 'danger'} size="sm">
                        {field.confidence}%
                      </Badge>
                    </div>
                    <p className="font-mono text-text">{field.value}</p>
                  </div>
                ))}
              </div>
            </TabContent>
            <TabContent value="validation">
              <div className="space-y-2">
                {caseData.validationResult?.checks?.map((check: any) => (
                  <div key={check.id} className={cn('flex items-center gap-3 p-3 bg-panel-secondary rounded-lg border',
                    check.status === 'pass' && 'border-success/30',
                    check.status === 'warning' && 'border-warning/30',
                    check.status === 'fail' && 'border-danger/30',
                    check.status === 'not_checked' && 'border-border/50'
                  )}>
                    <Badge variant={
                      check.status === 'pass' ? 'success' :
                      check.status === 'warning' ? 'warning' :
                      check.status === 'fail' ? 'danger' : 'neutral'
                    } size="sm">{check.status.toUpperCase()}</Badge>
                    <div className="flex-1">
                      <p className="font-medium text-text">{check.name}</p>
                      <p className="text-sm text-muted-text">{check.description}</p>
                    </div>
                    <span className="text-xs text-muted-text">{check.category}</span>
                  </div>
                ))}
              </div>
            </TabContent>
            <TabContent value="tampering">
              <div className="space-y-3">
                {caseData.tamperingResult?.findings?.map((finding: any) => (
                  <div key={finding.id} className={cn('p-3 bg-panel-secondary rounded-lg border',
                    finding.status === 'clean' && 'border-success/30',
                    finding.status === 'suspicious' && 'border-warning/30',
                    finding.status === 'tampered' && 'border-danger/30'
                  )}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-text">{finding.name}</span>
                      <Badge variant={
                        finding.status === 'clean' ? 'success' :
                        finding.status === 'suspicious' ? 'warning' : 'danger'
                      } size="sm">{finding.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-text mb-2">{finding.description}</p>
                    <div className="h-2 bg-panel rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full',
                        finding.status === 'clean' && 'bg-success',
                        finding.status === 'suspicious' && 'bg-warning',
                        finding.status === 'tampered' && 'bg-danger'
                      )} style={{ width: `${finding.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </TabContent>
            <TabContent value="face">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-panel-secondary rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-text">{caseData.faceResult?.similarity?.toFixed(1)}%</p>
                  <p className="text-sm text-muted-text">Similarity Score</p>
                </div>
                <div className="bg-panel-secondary rounded-lg p-4 text-center">
                  <Badge variant={caseData.faceResult?.decision === 'match' ? 'success' : caseData.faceResult?.decision === 'mismatch' ? 'danger' : 'neutral'} size="md">
                    {caseData.faceResult?.decision?.toUpperCase()}
                  </Badge>
                  <p className="text-sm text-muted-text mt-1">Decision</p>
                </div>
                <div className="bg-panel-secondary rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-text">Liveness: {caseData.faceResult?.presentedFace?.livenessStatus?.replace('_', ' ')}</p>
                </div>
              </div>
            </TabContent>
            <TabContent value="metadata">
              <div className="text-center py-8 text-muted-text">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Document metadata would be displayed here</p>
              </div>
            </TabContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Link to="/cases">
          <Button variant="secondary">Back to Cases</Button>
        </Link>
        <Button variant="primary">
          <Download className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      </div>
    </div>
  );
}
