import { useState } from 'react';
import { Shield, Cpu, Sliders, FileText, Globe, Lock, Info, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils/cn';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Input } from '../components/common/Input';
import { Progress } from '../components/common/Progress';
import { FadeIn, StaggerContainer } from '../components/animations';

export function Settings() {
  const [activeTab, setActiveTab] = useState('system');

  const tabs = [
    { id: 'system', label: 'System', icon: Shield },
    { id: 'ai', label: 'AI Configuration', icon: Cpu },
    { id: 'thresholds', label: 'Risk Thresholds', icon: Sliders },
    { id: 'documents', label: 'Document Types', icon: FileText },
    { id: 'api', label: 'API Configuration', icon: Globe },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'about', label: 'About', icon: Info },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-text">Settings</h1>
          <p className="text-muted-text">Preview future system configuration and integrations</p>
        </div>
      </FadeIn>

      <p role="note" className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">Configuration preview only. These controls do not configure live services, security policies, or persistent settings. The working demo is controlled from New Screening.</p>
      <FadeIn delay={0.1}>
        <Card padding="none">
          <CardContent className="p-0">
            <div className="flex flex-col lg:flex-row">
              <nav className="lg:w-48 border-r border-border bg-panel-secondary/50">
                <ul className="p-2 space-y-1" role="tablist">
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <li key={tab.id} role="presentation">
                        <motion.button
                          role="tab"
                          aria-selected={isActive}
                          onClick={() => setActiveTab(tab.id)}
                          whileHover={{ x: 4 }}
                          whileTap={{ scale: 0.98 }}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                            isActive
                              ? 'bg-primary-accent/20 text-primary-accent'
                              : 'text-muted-text hover:text-text hover:bg-panel-secondary'
                          )}
                        >
                          <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                          <span>{tab.label}</span>
                        </motion.button>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto"
                >
                  {activeTab === 'system' && <SystemSettings />}
                  {activeTab === 'ai' && <AISettings />}
                  {activeTab === 'thresholds' && <ThresholdSettings />}
                  {activeTab === 'documents' && <DocumentSettings />}
                  {activeTab === 'api' && <APISettings />}
                  {activeTab === 'security' && <SecuritySettings />}
                  {activeTab === 'about' && <AboutSettings />}
                </motion.div>
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}

function SystemSettings() {
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text mb-4">General</h2>
        <div className="space-y-4">
          <SettingRow
            label="Dark Mode"
            description="Use dark theme for the interface"
            action={
              <Button variant={darkMode ? 'primary' : 'ghost'} onClick={() => setDarkMode(!darkMode)}>
                {darkMode ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              </Button>
            }
          />
          <SettingRow
            label="Notifications"
            description="Enable browser notifications for case updates"
            action={
              <Button variant={notifications ? 'primary' : 'ghost'} onClick={() => setNotifications(!notifications)}>
                {notifications ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              </Button>
            }
          />
          <SettingRow
            label="Auto-save Drafts"
            description="Automatically save screening progress"
            action={
              <Button variant={autoSave ? 'primary' : 'ghost'} onClick={() => setAutoSave(!autoSave)}>
                {autoSave ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              </Button>
            }
          />
        </div>
      </div>

      <div className="pt-6 border-t border-border">
        <h2 className="text-lg font-semibold text-text mb-4">System Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-panel-secondary rounded-lg p-4">
            <p className="text-sm text-muted-text">Version</p>
            <p className="font-mono text-text">1.0.0-beta</p>
          </div>
          <div className="bg-panel-secondary rounded-lg p-4">
            <p className="text-sm text-muted-text">Environment</p>
            <Badge variant="warning">Demo</Badge>
          </div>
          <div className="bg-panel-secondary rounded-lg p-4">
            <p className="text-sm text-muted-text">Build Date</p>
            <p className="font-mono text-text">Not supplied</p>
          </div>
          <div className="bg-panel-secondary rounded-lg p-4">
            <p className="text-sm text-muted-text">Node Version</p>
            <p className="font-mono text-text">Not available in browser</p>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-border flex justify-end">
        <Button variant="primary" disabled title="Backend configuration is not connected"><Save className="w-4 h-4 mr-2" /> Save Changes</Button>
      </div>
    </div>
  );
}

function AISettings() {
  const [ocrEnabled, setOcrEnabled] = useState(true);
  const [validationEnabled, setValidationEnabled] = useState(true);
  const [tamperingEnabled, setTamperingEnabled] = useState(true);
  const [faceEnabled, setFaceEnabled] = useState(true);
  const [riskEnabled, setRiskEnabled] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text mb-4">AI Modules</h2>
        <div className="space-y-4">
          <SettingRow
            label="OCR Extraction"
            description="Enable optical character recognition for document text extraction"
            action={
              <Button variant={ocrEnabled ? 'primary' : 'ghost'} onClick={() => setOcrEnabled(!ocrEnabled)}>
                {ocrEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              </Button>
            }
          />
          <SettingRow
            label="Document Validation"
            description="Enable document structure and format validation checks"
            action={
              <Button variant={validationEnabled ? 'primary' : 'ghost'} onClick={() => setValidationEnabled(!validationEnabled)}>
                {validationEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              </Button>
            }
          />
          <SettingRow
            label="Tampering Detection"
            description="Enable forensic analysis for document manipulation detection"
            action={
              <Button variant={tamperingEnabled ? 'primary' : 'ghost'} onClick={() => setTamperingEnabled(!tamperingEnabled)}>
                {tamperingEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              </Button>
            }
          />
          <SettingRow
            label="Face Verification"
            description="Enable face comparison between document and presented person"
            action={
              <Button variant={faceEnabled ? 'primary' : 'ghost'} onClick={() => setFaceEnabled(!faceEnabled)}>
                {faceEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              </Button>
            }
          />
          <SettingRow
            label="Risk Scoring"
            description="Enable AI-powered risk assessment and scoring"
            action={
              <Button variant={riskEnabled ? 'primary' : 'ghost'} onClick={() => setRiskEnabled(!riskEnabled)}>
                {riskEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              </Button>
            }
          />
        </div>
      </div>

      <div className="pt-6 border-t border-border">
        <h2 className="text-lg font-semibold text-text mb-4">Model Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="label">OCR Confidence Threshold</label>
            <Progress value={85} max={100} showLabel label="85%" size="md" />
            <p className="text-sm text-muted-text mt-1">Minimum confidence for OCR field acceptance</p>
          </div>
          <div>
            <label className="label">Face Similarity Threshold</label>
            <Progress value={85} max={100} showLabel label="85%" size="md" />
            <p className="text-sm text-muted-text mt-1">Minimum similarity score for face match</p>
          </div>
          <div>
            <label className="label">Tampering Sensitivity</label>
            <Progress value={70} max={100} showLabel label="70%" size="md" variant="warning" />
            <p className="text-sm text-muted-text mt-1">Sensitivity level for manipulation detection</p>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-border flex justify-end">
        <Button variant="primary" disabled title="Backend configuration is not connected"><Save className="w-4 h-4 mr-2" /> Save Changes</Button>
      </div>
    </div>
  );
}

function ThresholdSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text mb-4">Risk Score Thresholds</h2>
        <p className="text-muted-text mb-6">Define score boundaries for risk level classification</p>
        <div className="space-y-4">
          <ThresholdRow label="Low Risk" range="0 - 29" color="success" description="No significant anomalies detected" />
          <ThresholdRow label="Review Required" range="30 - 69" color="warning" description="Minor anomalies requiring human review" />
          <ThresholdRow label="High Risk" range="70 - 100" color="danger" description="Significant anomalies detected" />
        </div>
      </div>

      <div className="pt-6 border-t border-border">
        <h2 className="text-lg font-semibold text-text mb-4">Action Thresholds</h2>
        <div className="space-y-4">
          <ActionThresholdRow action="Clear" threshold="0-29" description="Automatic clearance for low-risk cases" variant="success" />
          <ActionThresholdRow action="Secondary Inspection" threshold="30-69" description="Manual review required" variant="warning" />
          <ActionThresholdRow action="Detain" threshold="70-100" description="Immediate detention for high-risk cases" variant="danger" />
        </div>
      </div>

      <div className="pt-6 border-t border-border flex justify-end">
        <Button variant="primary" disabled title="Backend configuration is not connected"><Save className="w-4 h-4 mr-2" /> Save Changes</Button>
      </div>
    </div>
  );
}

function DocumentSettings() {
  const [passportEnabled, setPassportEnabled] = useState(true);
  const [visaEnabled, setVisaEnabled] = useState(true);
  const [nationalIdEnabled, setNationalIdEnabled] = useState(true);
  const [drivingLicenseEnabled, setDrivingLicenseEnabled] = useState(true);
  const [permitEnabled, setPermitEnabled] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text mb-4">Supported Document Types</h2>
        <div className="space-y-4">
          <SettingRow
            label="Passport"
            description="International travel document with MRZ"
            action={
              <Button variant={passportEnabled ? 'primary' : 'ghost'} onClick={() => setPassportEnabled(!passportEnabled)}>
                {passportEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              </Button>
            }
          />
          <SettingRow
            label="Visa"
            description="Entry permit with passport reference"
            action={
              <Button variant={visaEnabled ? 'primary' : 'ghost'} onClick={() => setVisaEnabled(!visaEnabled)}>
                {visaEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              </Button>
            }
          />
          <SettingRow
            label="National ID"
            description="Government-issued identity card"
            action={
              <Button variant={nationalIdEnabled ? 'primary' : 'ghost'} onClick={() => setNationalIdEnabled(!nationalIdEnabled)}>
                {nationalIdEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              </Button>
            }
          />
          <SettingRow
            label="Driving License"
            description="Domestic driving permit"
            action={
              <Button variant={drivingLicenseEnabled ? 'primary' : 'ghost'} onClick={() => setDrivingLicenseEnabled(!drivingLicenseEnabled)}>
                {drivingLicenseEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              </Button>
            }
          />
          <SettingRow
            label="Permit"
            description="Special authorization documents"
            action={
              <Button variant={permitEnabled ? 'primary' : 'ghost'} onClick={() => setPermitEnabled(!permitEnabled)}>
                {permitEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              </Button>
            }
          />
        </div>
      </div>

      <div className="pt-6 border-t border-border">
        <h2 className="text-lg font-semibold text-text mb-4">Upload Settings</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Max File Size (MB)" defaultValue="10" type="number" />
            <Input label="Allowed Extensions" defaultValue="png, jpg, jpeg, pdf" />
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-border flex justify-end">
        <Button variant="primary" disabled title="Backend configuration is not connected"><Save className="w-4 h-4 mr-2" /> Save Changes</Button>
      </div>
    </div>
  );
}

function APISettings() {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
        <div className="flex items-center gap-3">
          <span className="text-warning">⚠</span>
          <div>
            <p className="font-medium text-text">Backend Integration Pending</p>
            <p className="text-sm text-muted-text">API endpoints are currently mocked. Configure real endpoints when backend is available.</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-text mb-4">API Endpoints</h2>
        <div className="space-y-4">
          <ApiEndpointRow name="OCR API" url="https://api.idshield.ai/ocr" status="mock" description="Document text extraction service" />
          <ApiEndpointRow name="Validation API" url="https://api.idshield.ai/validate" status="mock" description="Document format and structure validation" />
          <ApiEndpointRow name="Tampering API" url="https://api.idshield.ai/tampering" status="mock" description="Forensic analysis and manipulation detection" />
          <ApiEndpointRow name="Face Verification API" url="https://api.idshield.ai/face" status="mock" description="Face comparison and liveness detection" />
          <ApiEndpointRow name="Risk Scoring API" url="https://api.idshield.ai/risk" status="mock" description="AI-powered risk assessment engine" />
          <ApiEndpointRow name="Database API" url="https://api.idshield.ai/database" status="mock" description="Watchlist and identity database queries" />
          <ApiEndpointRow name="Report Generation API" url="https://api.idshield.ai/reports" status="mock" description="PDF/HTML report generation service" />
        </div>
      </div>

      <div className="pt-6 border-t border-border">
        <h2 className="text-lg font-semibold text-text mb-4">Authentication</h2>
        <div className="space-y-4">
          <Input label="API Key" type="password" placeholder="Enter API key" disabled />
          <Input label="API Secret" type="password" placeholder="Enter API secret" disabled />
          <p className="text-sm text-muted-text">Credentials will be configured when backend integration is complete</p>
        </div>
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text mb-4">Access Control</h2>
        <div className="space-y-4">
          <SettingRow
            label="Two-Factor Authentication"
            description="Require 2FA for all operator accounts"
            action={
              <Button variant="ghost" disabled title="Not connected in this frontend demo">
                <ToggleLeft className="w-5 h-5" />
              </Button>
            }
          />
          <SettingRow
            label="Session Timeout"
            description="Auto-logout after 30 minutes of inactivity"
            action={
              <Button variant="primary" disabled title="Not connected in this frontend demo">
                <ToggleRight className="w-5 h-5" />
              </Button>
            }
          />
          <SettingRow
            label="Audit Logging"
            description="Log all system and user actions"
            action={
              <Button variant="primary" disabled title="Not connected in this frontend demo">
                <ToggleRight className="w-5 h-5" />
              </Button>
            }
          />
          <SettingRow
            label="Data Encryption"
            description="Encrypt all stored documents and data"
            action={
              <Button variant="primary" disabled title="Not connected in this frontend demo">
                <ToggleRight className="w-5 h-5" />
              </Button>
            }
          />
        </div>
      </div>

      <div className="pt-6 border-t border-border">
        <h2 className="text-lg font-semibold text-text mb-4">Privacy & Compliance</h2>
        <div className="space-y-3 text-sm text-muted-text">
          <p>• No real identity documents should be uploaded in demo mode</p>
          <p>• All uploaded files are stored temporarily in browser memory only</p>
          <p>• No data is transmitted to external services in demo mode</p>
          <p>• Cases and audit logs exist only in this browser session; refreshing clears new demo records.</p>
        </div>
      </div>
    </div>
  );
}

function AboutSettings() {
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="w-20 h-20 rounded-2xl bg-primary-accent/20 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-10 h-10 text-primary-accent" />
        </div>
        <h2 className="text-2xl font-bold text-text">IDShield AI</h2>
        <p className="text-muted-text mt-2">Identity & Document Intelligence Platform</p>
        <p className="text-sm text-muted-text mt-1">Version 1.0.0-beta • Smart India Hackathon Prototype</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-panel-secondary rounded-lg p-4">
          <h3 className="font-medium text-text mb-2">Project</h3>
          <p className="text-sm text-muted-text">AI-Powered Fake Identity & Document Screening System for border/security checkpoints</p>
        </div>
        <div className="bg-panel-secondary rounded-lg p-4">
          <h3 className="font-medium text-text mb-2">Tech Stack</h3>
          <p className="text-sm text-muted-text">React, TypeScript, Vite, Tailwind CSS, React Router, Lucide React</p>
        </div>
        <div className="bg-panel-secondary rounded-lg p-4">
          <h3 className="font-medium text-text mb-2">Features</h3>
          <p className="text-sm text-muted-text">OCR, Validation, Tampering Detection, Face Verification, Risk Scoring, Case Management</p>
        </div>
        <div className="bg-panel-secondary rounded-lg p-4">
          <h3 className="font-medium text-text mb-2">Status</h3>
          <Badge variant="warning">Demo Mode</Badge>
        </div>
      </div>

      <div className="pt-6 border-t border-border">
        <h3 className="font-medium text-text mb-3">Disclaimer</h3>
        <p className="text-sm text-muted-text">
          This is a prototype for demonstration purposes only. All AI analysis results are simulated using mock data.
          This system should not be used for actual identity verification or legal determinations without proper
          backend integration, model validation, and regulatory compliance review.
        </p>
      </div>
    </div>
  );
}

function SettingRow({ label, description, action }: { label: string; description: string; action: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-4 bg-panel-secondary rounded-lg border border-border/50">
      <div className="flex-1">
        <p className="font-medium text-text">{label}</p>
        <p className="text-sm text-muted-text">{description}</p>
      </div>
      <div>{action}</div>
    </div>
  );
}

function ThresholdRow({ label, range, color, description }: { label: string; range: string; color: 'success' | 'warning' | 'danger'; description: string }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-panel-secondary rounded-lg border border-border/50">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}/20` }}>
        <span className="font-bold" style={{ color: `var(--color-${color})` }}>{label.split(' ')[0][0]}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <span className="font-medium text-text">{label}</span>
          <Badge variant={color}>{range}</Badge>
        </div>
        <p className="text-sm text-muted-text">{description}</p>
      </div>
    </div>
  );
}

function ActionThresholdRow({ action, threshold, description, variant = 'danger' }: { action: string; threshold: string; description: string; variant?: 'danger' | 'warning' | 'success' }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-panel-secondary rounded-lg border border-border/50">
      <Badge variant={variant} size="md">{action}</Badge>
      <div className="flex-1">
        <p className="font-mono text-text">{threshold}</p>
        <p className="text-sm text-muted-text">{description}</p>
      </div>
    </div>
  );
}

function ApiEndpointRow({ name, url, status, description }: { name: string; url: string; status: 'mock' | 'connected' | 'error'; description: string }) {
  const statusConfig = {
    mock: { variant: 'warning' as const, label: 'Mock Mode' },
    connected: { variant: 'success' as const, label: 'Connected' },
    error: { variant: 'danger' as const, label: 'Error' },
  };
  const config = statusConfig[status];

  return (
    <div className="p-4 bg-panel-secondary rounded-lg border border-border/50">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-text">{name}</span>
        <Badge variant={config.variant} size="sm">{config.label}</Badge>
      </div>
      <p className="font-mono text-sm text-muted-text mb-1">{url}</p>
      <p className="text-sm text-muted-text">{description}</p>
      {status === 'mock' && (
        <p className="text-xs text-warning mt-2">Backend integration pending</p>
      )}
    </div>
  );
}
