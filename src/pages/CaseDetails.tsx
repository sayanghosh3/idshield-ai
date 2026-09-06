import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, AlertTriangle, CheckCircle, Shield, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Tabs, TabsList, TabTrigger, TabContent } from '../components/common/Tabs';
import { Progress } from '../components/common/Progress';
import { mockScreeningCases } from '../mocks/screeningData';
import { mockAuditEvents, mockReports, mockCaseNotes } from '../mocks/cases';
import { formatRelativeTime, getRiskLevelColor, getRiskLevelLabel, formatScore } from '../utils/formatters';

export function CaseDetails() {
  const { caseId } = useParams();
  const caseData = mockScreeningCases.find(c => c.id === caseId || c.caseNumber === caseId) || mockScreeningCases[0];
  const auditEvents = mockAuditEvents.filter(e => e.caseId === caseData.id);
  const reports = mockReports.filter(r => r.caseId === caseData.id);
  const notes = mockCaseNotes.filter(n => n.caseId === caseData.id);
  const riskColor = caseData.riskLevel === 'high' ? '#EF4444' : caseData.riskLevel === 'review' ? '#F59E0B' : '#22C55E';

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-text">{caseData.caseNumber}</h1>
            <Badge variant={caseData.riskLevel === 'high' ? 'danger' : caseData.riskLevel === 'review' ? 'warning' : 'success'} size="md">
              {getRiskLevelLabel(caseData.riskLevel)} RISK
            </Badge>
            <Badge variant="info" size="sm">{caseData.riskScore} / 100</Badge>
          </div>
          <p className="text-muted-text">Subject: {caseData.documents[0]?.name.replace('Passport_', '').replace('.pdf', '').replace(/_/g, ' ')} • {formatRelativeTime(caseData.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary">
            <Download className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" variant="line">
        <TabsList className="grid grid-cols-4 gap-1 bg-panel-secondary p-1 rounded-lg" aria-label="Case sections">
          {['Overview', 'Document', 'Evidence', 'Audit'].map(tab => (
            <TabTrigger key={tab.toLowerCase()} value={tab.toLowerCase()}>{tab}</TabTrigger>
          ))}
        </TabsList>

        <TabContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <Card className="lg:col-span-2" padding="lg">
              <CardHeader>
                <CardTitle>Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="relative mb-6">
                      <svg width="160" height="160" className="transform -rotate-90">
                        <circle cx="80" cy="80" r="70" stroke="#263244" strokeWidth="12" fill="none" />
                        <circle
                          cx="80"
                          cy="80"
                          r="70"
                          stroke={riskColor}
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={439.8}
                          strokeDashoffset={439.8 - (caseData.riskScore / 100) * 439.8}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold text-text">{caseData.riskScore}</span>
                        <span className="text-muted-text">/ 100</span>
                      </div>
                    </div>
                    <Badge variant={caseData.riskLevel === 'high' ? 'danger' : caseData.riskLevel === 'review' ? 'warning' : 'success'} size="lg">
                      {getRiskLevelLabel(caseData.riskLevel)} RISK
                    </Badge>
                  </div>

                  <div>
                    <h4 className="font-medium text-text mb-4">Risk Contributors</h4>
                    <div className="space-y-3">
                      {caseData.riskResult?.contributors?.map((contributor: any) => (
                        <div key={contributor.id} className="bg-panel-secondary rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-text">{contributor.factor}</span>
                            <Badge variant={contributor.type === 'positive' ? 'success' : 'danger'} size="sm">
                              {contributor.type === 'positive' ? '+' : ''}{contributor.impact}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-text mb-3">{contributor.description}</p>
                          <div className="h-2 bg-panel rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all duration-500', contributor.type === 'positive' ? 'bg-success' : 'bg-danger')}
                              style={{ width: `${Math.abs(contributor.impact) * 2}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-border">
                  <h4 className="font-medium text-text mb-4">Explainable AI — Why was this case flagged?</h4>
                  <div className="space-y-2">
                    {caseData.riskResult?.explanation?.map((exp: string, i: number) => (
                      <div key={i} className="flex gap-3 p-3 bg-panel-secondary rounded-lg">
                        <span className="text-primary-accent font-mono">{i + 1}.</span>
                        <p className="text-text flex-1">{exp}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-border">
                  <h4 className="font-medium text-text mb-4">Recommended Action</h4>
                  <div className={cn('p-4 rounded-lg text-center', caseData.riskResult?.recommendation === 'clear' ? 'bg-success/20' : caseData.riskResult?.recommendation === 'secondary_inspection' ? 'bg-warning/20' : 'bg-danger/20')}>
                    <p className="font-medium text-lg">Recommended Action:</p>
                    <p className="text-xl font-bold mt-1" style={{ color: riskColor }}>
                      {caseData.riskResult?.recommendation?.replace('_', ' ').toUpperCase() || 'SECONDARY INSPECTION'}
                    </p>
                    <p className="text-sm text-muted-text mt-2">
                      This is an AI-assisted recommendation. Final determination requires human operator review.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card padding="lg">
              <CardHeader>
                <CardTitle>Case Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-panel-secondary rounded-lg p-4">
                  <p className="text-sm text-muted-text">Status</p>
                  <Badge variant={caseData.status === 'completed' ? 'success' : 'warning'} size="md" className="w-full justify-center">
                    {caseData.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="bg-panel-secondary rounded-lg p-4">
                  <p className="text-sm text-muted-text">Document</p>
                  <p className="font-medium text-text">{caseData.documents[0]?.documentType || 'Passport'}</p>
                </div>
                <div className="bg-panel-secondary rounded-lg p-4">
                  <p className="text-sm text-muted-text">Assigned Operator</p>
                  <p className="font-medium text-text">{caseData.assignedOperator || 'Unassigned'}</p>
                </div>
                <div className="bg-panel-secondary rounded-lg p-4">
                  <p className="text-sm text-muted-text">Created</p>
                  <p className="font-medium text-text">{formatRelativeTime(caseData.createdAt)}</p>
                </div>
                <div className="bg-panel-secondary rounded-lg p-4">
                  <p className="text-sm text-muted-text">Completed</p>
                  <p className="font-medium text-text">{caseData.completedAt ? formatRelativeTime(caseData.completedAt) : '—'}</p>
                </div>
                <div className="bg-panel-secondary rounded-lg p-4">
                  <p className="text-sm text-muted-text">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {caseData.tags.map((tag: string) => (
                      <Badge key={tag} variant="neutral" size="sm">{tag}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabContent>

        <TabContent value="document">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card padding="lg">
              <CardHeader>
                <CardTitle>OCR Extraction</CardTitle>
              </CardHeader>
              <CardContent>
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
                      <Progress value={field.confidence} max={100} size="sm" variant={field.confidence > 90 ? 'success' : field.confidence > 70 ? 'warning' : 'danger'} />
                    </div>
                  ))}
                </div>

                {caseData.ocrResult?.mrz && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <h4 className="font-medium text-text mb-3">Machine Readable Zone</h4>
                    <div className="bg-panel-secondary rounded-lg p-4 font-mono text-sm space-y-1 overflow-x-auto">
                      <div className="text-primary-accent">{caseData.ocrResult.mrz.line1}</div>
                      <div className="text-primary-accent">{caseData.ocrResult.mrz.line2}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card padding="lg">
              <CardHeader>
                <CardTitle>Validation Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-panel-secondary rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-success">{caseData.validationResult?.passed || 0}</p>
                    <p className="text-sm text-muted-text">Passed</p>
                  </div>
                  <div className="bg-panel-secondary rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-warning">{caseData.validationResult?.warnings || 0}</p>
                    <p className="text-sm text-muted-text">Warnings</p>
                  </div>
                  <div className="bg-panel-secondary rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-danger">{caseData.validationResult?.failed || 0}</p>
                    <p className="text-sm text-muted-text">Failed</p>
                  </div>
                </div>

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
              </CardContent>
            </Card>

            <Card padding="lg">
              <CardHeader>
                <CardTitle>Tampering Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
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
                      <Progress value={finding.score} max={100} size="sm" variant={
                        finding.status === 'clean' ? 'success' :
                        finding.status === 'suspicious' ? 'warning' : 'danger'
                      } />
                    </div>
                  ))}
                </div>
                <div className="bg-panel-secondary rounded-lg p-4 border border-primary-accent/30">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-text">Overall Tampering Probability</span>
                    <Badge variant={caseData.tamperingResult?.overallStatus === 'clean' ? 'success' : caseData.tamperingResult?.overallStatus === 'suspicious' ? 'warning' : 'danger'} size="lg">
                      {caseData.tamperingResult?.overallScore}%
                    </Badge>
                  </div>
                  <Progress value={caseData.tamperingResult?.overallScore || 0} max={100} size="md" variant={
                    caseData.tamperingResult?.overallStatus === 'clean' ? 'success' :
                    caseData.tamperingResult?.overallStatus === 'suspicious' ? 'warning' : 'danger'
                  } />
                </div>
              </CardContent>
            </Card>

            <Card padding="lg">
              <CardHeader>
                <CardTitle>Face Verification</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-medium text-text mb-3">Document Face</h4>
                    <div className="bg-panel-secondary rounded-lg p-4 min-h-[200px] flex items-center justify-center">
                      <span className="text-muted-text">Document face crop</span>
                    </div>
                    <p className="text-sm text-muted-text mt-2">Quality: {caseData.faceResult?.documentFace?.qualityScore}%</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-text mb-3">Presented Person</h4>
                    <div className="bg-panel-secondary rounded-lg p-4 min-h-[200px] flex items-center justify-center">
                      <span className="text-muted-text">Live capture</span>
                    </div>
                    <p className="text-sm text-muted-text mt-2">Quality: {caseData.faceResult?.presentedFace?.qualityScore}%</p>
                    <p className="text-sm text-muted-text">Liveness: {caseData.faceResult?.presentedFace?.livenessStatus?.replace('_', ' ')}</p>
                  </div>
                </div>

                <div className="bg-panel-secondary rounded-lg p-6 text-center">
                  <div className="text-5xl font-bold mb-2" style={{ color: caseData.faceResult?.decision === 'match' ? '#22C55E' : '#EF4444' }}>
                    {caseData.faceResult?.similarity?.toFixed(1)}%
                  </div>
                  <Badge variant={caseData.faceResult?.decision === 'match' ? 'success' : 'danger'} size="lg">
                    {caseData.faceResult?.decision === 'match' ? 'MATCH' : 'MISMATCH'}
                  </Badge>
                  <p className="text-sm text-muted-text mt-2">Threshold: {caseData.faceResult?.threshold}%</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabContent>

        <TabContent value="evidence">
          <div className="mt-6">
            <Card padding="lg">
              <CardHeader>
                <CardTitle>Evidence Viewer</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="findings" variant="line">
                  <TabsList>
                    {['Findings', 'Regions', 'Metadata'].map(tab => (
                      <TabTrigger key={tab.toLowerCase()} value={tab.toLowerCase()}>{tab}</TabTrigger>
                    ))}
                  </TabsList>
                  <TabContent value="findings">
                    <div className="space-y-3 mt-4">
                      {caseData.riskResult?.explanation?.map((exp: string, i: number) => (
                        <div key={i} className="p-3 bg-panel-secondary rounded-lg border border-border/50 flex items-start gap-3 cursor-pointer hover:border-primary-accent/50 transition-colors">
                          <span className="text-primary-accent font-mono mt-0.5">{i + 1}.</span>
                          <p className="text-text flex-1">{exp}</p>
                        </div>
                      ))}
                    </div>
                  </TabContent>
                  <TabContent value="regions">
                    <div className="text-center py-8 text-muted-text">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Click findings above to highlight document regions</p>
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
          </div>
        </TabContent>

        <TabContent value="audit">
          <div className="mt-6">
            <Card padding="none">
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {auditEvents.map((event) => (
                    <div key={event.id} className="flex items-start gap-4 p-4 hover:bg-panel-secondary/50 transition-colors">
                      <div className="flex-shrink-0 w-10 text-center text-muted-text text-xs font-mono">
                        {formatRelativeTime(event.timestamp).split(' ')[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-text">{event.event}</p>
                          <Badge variant={
                            event.status === 'success' ? 'success' :
                            event.status === 'warning' ? 'warning' : 'danger'
                          } size="sm">{event.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-text">{event.actor} ({event.actorType})</p>
                        {event.details && (
                          <p className="text-xs text-muted-text mt-1 font-mono">
                            {JSON.stringify(event.details)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabContent>
      </Tabs>
    </div>
  );
}