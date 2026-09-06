import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, X, CheckCircle, AlertCircle, Loader2, FileText, Image, Upload, RotateCcw, ZoomIn, ZoomOut, Maximize2, Minimize2, Shield } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Progress, StepProgress } from '../components/common/Progress';
import { Tabs, TabsList, TabTrigger, TabContent } from '../components/common/Tabs';
import { Modal, ConfirmDialog } from '../components/common/Modal';
import { useFileUpload, useImagePreview, useImageTransform } from '../hooks/useFileUpload';
import { useScreening } from '../hooks/useScreening';
import { useDemoMode } from '../hooks/useDemoMode';
import { screeningService } from '../services/screeningService';
import { documentService } from '../services/documentService';
import { demoDocuments, demoOCRResults, documentTypes, allowedFileTypes, maxFileSize } from '../mocks/documents';
import { screeningSteps, createDemoCase } from '../mocks/screeningData';
import { ScreeningStep } from '../types';
import { formatFileSize, formatRelativeTime, getRiskLevelLabel } from '../utils/formatters';

const STEP_ORDER: readonly ScreeningStep[] = ['upload', 'extraction', 'validation', 'forensics', 'face_verification', 'risk_assessment', 'result'];

export function NewScreening() {
  const navigate: ReturnType<typeof useNavigate> = useNavigate();
  const {
    uploadedDocuments,
    extractedData,
    validationResults,
    tamperingResults,
    faceResults,
    riskResult,
    screeningStatus,
    currentStep,
    progress,
    progressMessage,
    error,
    addDocument,
    removeDocument,
    setExtractedData,
    setValidationResults,
    setTamperingResults,
    setFaceResults,
    setRiskResult,
    setScreeningStatus,
    setCurrentStep,
    setProgress,
    setError,
    resetScreening,
    loadDemoScenario,
    addAuditEvent,
  } = useScreening();

  const { enabled: demoEnabled, activeScenario, setActiveScenario, scenarios } = useDemoMode();
  const [activeTab, setActiveTab] = useState('upload');
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<ScreeningStep[]>([]);

  const {
    files,
    errors,
    isDragging,
    fileInputRef,
    addFiles,
    removeFile: removeUploadedFile,
    clearFiles,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    openFileDialog,
  } = useFileUpload(allowedFileTypes, maxFileSize);

  const currentStepIndex = STEP_ORDER.indexOf(currentStep as ScreeningStep);
  const isStepCompleted = (step: ScreeningStep) => completedSteps.includes(step) || STEP_ORDER.indexOf(step) < currentStepIndex;
  const isStepActive = (step: string) => step === currentStep;

  const handleDemoSelect = useCallback((scenarioId: string) => {
    const demoCase = createDemoCase(scenarioId);
    loadDemoScenario(demoCase);
    setActiveScenario(scenarioId);
    setCompletedSteps([...STEP_ORDER]);
    setActiveTab('result');
    setShowDemoModal(false);
    addAuditEvent({
      id: `audit-${Date.now()}`,
      caseId: demoCase.id,
      timestamp: new Date(),
      event: `Demo scenario loaded: ${scenarios.find(s => s.id === scenarioId)?.name}`,
      category: 'user',
      status: 'success',
      actor: 'Security Operator',
      actorType: 'user',
    });
  }, [loadDemoScenario, setActiveScenario, scenarios, setCompletedSteps, addAuditEvent]);

  const handleStartScreening = useCallback(async () => {
    if (files.length === 0 && !demoEnabled) {
      setError('Please upload a document or select a demo scenario');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setScreeningStatus('processing');
    const newSteps: ScreeningStep[] = [];

    try {
      for (const step of STEP_ORDER) {
        setCurrentStep(step);
        setProgress(STEP_ORDER.indexOf(step) * 100 / STEP_ORDER.length, `${step.replace('_', ' ').replace(/^\w/, (c: string) => c.toUpperCase())}...`);
        newSteps.push(step);
        setCompletedSteps([...newSteps]);

        await new Promise(resolve => setTimeout(resolve, 800));

        switch (step) {
          case 'extraction':
            if (demoEnabled && activeScenario) {
              const demoCase = createDemoCase(activeScenario);
              setExtractedData(demoCase.ocrResult || null);
            } else if (files[0]) {
              const uploadResult = await screeningService.uploadDocument(files[0]);
              const ocrResult = await documentService.extractOCR(uploadResult.fileId, 'passport');
              setExtractedData(ocrResult);
            }
            break;
          case 'validation':
            if (demoEnabled && activeScenario) {
              const demoCase = createDemoCase(activeScenario);
              setValidationResults(demoCase.validationResult || null);
            }
            break;
          case 'forensics':
            if (demoEnabled && activeScenario) {
              const demoCase = createDemoCase(activeScenario);
              setTamperingResults(demoCase.tamperingResult || null);
            }
            break;
          case 'face_verification':
            if (demoEnabled && activeScenario) {
              const demoCase = createDemoCase(activeScenario);
              setFaceResults(demoCase.faceResult || null);
            }
            break;
          case 'risk_assessment':
            if (demoEnabled && activeScenario) {
              const demoCase = createDemoCase(activeScenario);
              setRiskResult(demoCase.riskResult || null);
            }
            break;
        }

        addAuditEvent({
          id: `audit-${Date.now()}`,
          caseId: `temp-${Date.now()}`,
          timestamp: new Date(),
          event: `${step.replace('_', ' ').replace(/^\w/, (c: string) => c.toUpperCase())} completed`,
          category: 'ai',
          status: 'success',
          actor: 'AI Engine',
          actorType: 'api',
        });
      }

      setScreeningStatus('completed');
      setProgress(100, 'Screening completed');
      setActiveTab('result');

      if (!demoEnabled && files[0]) {
        const caseResult = await screeningService.createCase(
          files.map(f => f.name),
          files[0]?.type || 'passport'
        );
        navigate(`/screening/result/${caseResult.id}`);
      }
    } catch (err) {
      setError('Screening failed. Please try again.');
      setScreeningStatus('failed');
    } finally {
      setIsProcessing(false);
    }
  }, [files, demoEnabled, activeScenario, setCurrentStep, setProgress, setCompletedSteps, setExtractedData, setValidationResults, setTamperingResults, setFaceResults, setRiskResult, setScreeningStatus, setError, setActiveTab, navigate, addAuditEvent, screeningService, documentService, files]);

  const handleReset = useCallback(() => {
    resetScreening();
    clearFiles();
    setCompletedSteps([]);
    setActiveTab('upload');
    setActiveScenario(null);
    setError(null);
  }, [resetScreening, clearFiles, setCompletedSteps, setActiveTab, setActiveScenario, setError]);

  const getStepStatus = (step: string) => {
    if (isStepCompleted(step as ScreeningStep)) return 'completed';
    if (isStepActive(step)) return 'active';
    return 'pending';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text">New Screening</h1>
            <p className="text-muted-text">Multi-step AI-powered document screening workflow</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {demoEnabled && activeScenario && (
            <Badge variant="info" className="gap-1">
              <span className="w-2 h-2 rounded-full bg-primary-accent" />
              {scenarios.find(s => s.id === activeScenario)?.name}
            </Badge>
          )}
          <Button variant="ghost" onClick={() => setShowDemoModal(true)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Demo Scenarios
          </Button>
          <Button variant="secondary" onClick={handleReset} disabled={isProcessing}>
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        </div>
      </div>

      <StepProgress
        steps={screeningSteps.map(s => s.label)}
        currentStep={currentStepIndex}
        completedSteps={completedSteps.map(s => STEP_ORDER.indexOf(s))}
        className="mb-6"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="upload" value={activeTab} onChange={setActiveTab} variant="enclosed">
            <TabsList className="grid grid-cols-7 gap-1 bg-panel-secondary p-1 rounded-lg" aria-label="Screening steps">
              {screeningSteps.map((step, index) => {
                const status = getStepStatus(step.step);
                return (
                  <TabTrigger
                    key={step.step}
                    value={step.step}
                    disabled={index > currentStepIndex && !isStepCompleted(step.step) && !demoEnabled}
                    className={cn(
                      'py-2 px-3 text-xs font-medium',
                      status === 'completed' && 'bg-success text-white',
                      status === 'active' && 'bg-primary-accent text-background',
                      status === 'pending' && 'text-muted-text'
                    )}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">
                        {status === 'completed' ? <CheckCircle className="w-3 h-3" /> : step.number}
                      </span>
                      <span className="hidden sm:inline">{step.label}</span>
                    </div>
                  </TabTrigger>
                );
              })}
            </TabsList>

            <TabContent value="upload">
              <Card padding="lg">
                <CardHeader>
                  <CardTitle>Document Upload</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={cn(
                      'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
                      isDragging ? 'border-primary-accent bg-primary-accent/5' : 'border-border hover:border-primary-accent/50'
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={openFileDialog}
                    role="button"
                    tabIndex={0}
                    aria-label="Drop zone for document upload"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={allowedFileTypes.join(',')}
                      onChange={handleFileSelect}
                      className="hidden"
                      aria-hidden="true"
                    />
                    <Upload className="w-12 h-12 mx-auto text-muted-text mb-4" />
                    <p className="text-lg font-medium text-text mb-1">Drag & drop document here</p>
                    <p className="text-sm text-muted-text mb-4">or click to browse</p>
                    <p className="text-xs text-muted-text">Supported: PNG, JPG, JPEG, PDF • Max 10MB</p>
                  </div>

                  {errors && Object.keys(errors).length > 0 && (
                    <div className="mt-4 p-4 bg-danger/10 border border-danger/20 rounded-lg">
                      <h4 className="font-medium text-danger mb-2">Upload Errors</h4>
                      <ul className="space-y-1 text-sm">
                        {Object.entries(errors).map(([fileName, error]) => (
                          <li key={fileName} className="text-danger flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{fileName}: {error}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(files.length > 0 || uploadedDocuments.length > 0) && (
                    <div className="mt-6 space-y-3">
                      <h4 className="font-medium text-text">Uploaded Documents</h4>
                      <div className="space-y-2">
                        {files.map((file, index) => (
                          <div key={index} className="flex items-center gap-4 p-3 bg-panel-secondary rounded-lg border border-border">
                            <div className="w-12 h-12 bg-panel rounded-lg flex items-center justify-center flex-shrink-0">
                              {file.type.startsWith('image/') ? (
                                <Image className="w-6 h-6 text-muted-text" />
                              ) : (
                                <FileText className="w-6 h-6 text-muted-text" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-text truncate">{file.name}</p>
                              <p className="text-xs text-muted-text">{formatFileSize(file.size)}</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => removeUploadedFile(index)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        {uploadedDocuments.map((doc, index) => (
                          <div key={doc.id} className="flex items-center gap-4 p-3 bg-panel-secondary rounded-lg border border-border">
                            <img src={doc.preview} alt={doc.name} className="w-12 h-12 rounded-lg object-cover" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-text truncate">{doc.name}</p>
                              <p className="text-xs text-muted-text">{formatFileSize(doc.size)} • {doc.documentType}</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => removeDocument(doc.id)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 pt-6 border-t border-border">
                    <h4 className="font-medium text-text mb-3">Demo Documents</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(demoDocuments).map(([key, doc]) => (
                        <button
                          key={key}
                          onClick={() => {
                            const url = doc.preview;
                            fetch(url)
                              .then(res => res.blob())
                              .then(blob => {
                                const file = new File([blob], doc.name, { type: doc.type });
                                addFiles([file]);
                              });
                          }}
                          className="flex items-center gap-3 p-3 bg-panel-secondary rounded-lg border border-border hover:border-primary-accent/50 transition-colors text-left"
                        >
                          <img src={doc.preview} alt={doc.name} className="w-10 h-10 rounded-lg object-cover" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-text truncate">{doc.name.replace('Passport_', '').replace('.pdf', '').replace(/_/g, ' ')}</p>
                            <p className="text-xs text-muted-text">Demo • {formatFileSize(doc.size)}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-text" />
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabContent>

            <TabContent value="extraction">
              {extractedData ? (
                <OCRResultsView data={extractedData} />
              ) : (
                <div className="text-center py-12 text-muted-text">
                  <Loader2 className="w-12 h-12 mx-auto animate-spin mb-4 text-primary-accent" />
                  <p>Run screening to extract OCR data</p>
                </div>
              )}
            </TabContent>

            <TabContent value="validation">
              {validationResults ? (
                <ValidationResultsView results={validationResults} />
              ) : (
                <div className="text-center py-12 text-muted-text">
                  <Loader2 className="w-12 h-12 mx-auto animate-spin mb-4 text-primary-accent" />
                  <p>Run screening to validate document</p>
                </div>
              )}
            </TabContent>

            <TabContent value="forensics">
              {tamperingResults ? (
                <TamperingResultsView results={tamperingResults} />
              ) : (
                <div className="text-center py-12 text-muted-text">
                  <Loader2 className="w-12 h-12 mx-auto animate-spin mb-4 text-primary-accent" />
                  <p>Run screening for tampering analysis</p>
                </div>
              )}
            </TabContent>

            <TabContent value="face_verification">
              {faceResults ? (
                <FaceVerificationView results={faceResults} />
              ) : (
                <div className="text-center py-12 text-muted-text">
                  <Loader2 className="w-12 h-12 mx-auto animate-spin mb-4 text-primary-accent" />
                  <p>Run screening for face verification</p>
                </div>
              )}
            </TabContent>

            <TabContent value="risk_assessment">
              {riskResult ? (
                <RiskAssessmentView result={riskResult} />
              ) : (
                <div className="text-center py-12 text-muted-text">
                  <Loader2 className="w-12 h-12 mx-auto animate-spin mb-4 text-primary-accent" />
                  <p>Run screening for risk assessment</p>
                </div>
              )}
            </TabContent>

            <TabContent value="result">
              {riskResult ? (
                <FinalResultView
                  riskResult={riskResult}
                  extractedData={extractedData}
                  validationResults={validationResults}
                  tamperingResults={tamperingResults}
                  faceResults={faceResults}
                />
              ) : (
                <div className="text-center py-12 text-muted-text">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-success" />
                  <p className="text-lg font-medium">Screening Complete</p>
                  <p className="text-muted-text mt-1">Results will appear here after screening completes</p>
                </div>
              )}
            </TabContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card padding="md">
            <CardHeader>
              <CardTitle>Screening Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progress} max={100} showLabel label={progressMessage} size="lg" />
              <div className="text-sm text-muted-text">
                Status: <span className="font-medium text-text capitalize">{screeningStatus.replace('_', ' ')}</span>
              </div>
              {error && (
                <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card padding="md">
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="primary"
                className="w-full justify-center gap-2"
                onClick={handleStartScreening}
                disabled={isProcessing || (files.length === 0 && !demoEnabled)}
                loading={isProcessing}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {isProcessing ? 'Processing...' : 'Start Screening'}
              </Button>
              <Button variant="ghost" className="w-full justify-center" onClick={() => setShowDemoModal(true)}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Load Demo Scenario
              </Button>
            </CardContent>
          </Card>

          {uploadedDocuments.length > 0 && (
            <Card padding="md">
              <CardHeader>
                <CardTitle>Document Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <ImagePreviewer
                  documents={uploadedDocuments}
                  onImageSelect={(doc) => {
                    if (doc.preview.startsWith('blob:')) {
                      addDocument(doc);
                    }
                  }}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Modal isOpen={showDemoModal} onClose={() => setShowDemoModal(false)} title="Select Demo Scenario" size="lg">
        <div className="space-y-3">
          {scenarios.map(scenario => (
            <button
              key={scenario.id}
              onClick={() => handleDemoSelect(scenario.id)}
              className={cn('w-full text-left p-4 rounded-lg border border-border hover:border-primary-accent/50 transition-colors flex items-center gap-4',
                activeScenario === scenario.id && 'bg-primary-accent/10 border-primary-accent'
              )}
            >
              <div className="w-12 h-12 rounded-lg bg-panel-secondary flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-primary-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text">{scenario.name}</p>
                <p className="text-sm text-muted-text">{scenario.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={scenario.riskLevel === 'high' ? 'danger' : scenario.riskLevel === 'review' ? 'warning' : 'success'}>
                  {scenario.riskScore} / 100
                </Badge>
                <Badge variant="info">{getRiskLevelLabel(scenario.riskLevel)}</Badge>
              </div>
            </button>
          ))}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleReset}
        title="Reset Screening"
        message="This will clear all uploaded documents and screening progress. Are you sure?"
        confirmText="Reset"
        variant="danger"
      />
    </div>
  );
}

function ImagePreviewer({ documents, onImageSelect }: { documents: any[]; onImageSelect: (doc: any) => void }) {
  const [selectedDoc, setSelectedDoc] = useState(documents[0]);
  const { zoom, rotation, pan, zoomIn, zoomOut, resetZoom, rotate, resetTransform, transformStyle } = useImageTransform();

  if (!selectedDoc) return <div className="text-center py-8 text-muted-text">No document selected</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {documents.map(doc => (
          <button
            key={doc.id}
            onClick={() => setSelectedDoc(doc)}
            className={cn('flex-shrink-0 p-1 rounded border-2 transition-colors',
              selectedDoc.id === doc.id ? 'border-primary-accent' : 'border-transparent hover:border-border'
            )}
            aria-label={`Select ${doc.name}`}
          >
            <img src={doc.preview} alt={doc.name} className="w-16 h-12 rounded object-cover" />
          </button>
        ))}
      </div>
      <div className="relative bg-panel-secondary rounded-lg overflow-hidden min-h-[300px] flex items-center justify-center">
        <div className="relative" style={transformStyle}>
          <img
            src={selectedDoc.preview}
            alt={selectedDoc.name}
            className="max-w-full max-h-[500px] object-contain"
            draggable={false}
          />
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <Button variant="secondary" size="sm" onClick={zoomOut}><ZoomOut className="w-4 h-4" /></Button>
        <Button variant="secondary" size="sm" onClick={resetZoom}><Minimize2 className="w-4 h-4" /></Button>
        <Button variant="secondary" size="sm" onClick={zoomIn}><ZoomIn className="w-4 h-4" /></Button>
        <Button variant="secondary" size="sm" onClick={() => rotate(90)}><RotateCcw className="w-4 h-4" /></Button>
        <Button variant="secondary" size="sm" onClick={resetTransform}><Maximize2 className="w-4 h-4" /></Button>
        <span className="text-sm text-muted-text px-2">{Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
}

function OCRResultsView({ data }: { data: any }) {
  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>OCR Extraction Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-text mb-3">Document Preview</h4>
            <div className="bg-panel-secondary rounded-lg p-4 min-h-[300px] flex items-center justify-center">
              <span className="text-muted-text">Document preview would appear here</span>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-text mb-3">Extracted Fields</h4>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {data.extractedFields?.map((field: any) => (
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
          </div>
        </div>

        {data.mrz && (
          <div className="mt-6 pt-6 border-t border-border">
            <h4 className="font-medium text-text mb-3">Machine Readable Zone (MRZ)</h4>
            <div className="bg-panel-secondary rounded-lg p-4 font-mono text-sm space-y-1 overflow-x-auto">
              <div className="text-primary-accent">{data.mrz.line1}</div>
              <div className="text-primary-accent">{data.mrz.line2}</div>
              {data.mrz.line3 && <div className="text-primary-accent">{data.mrz.line3}</div>}
            </div>
            <h4 className="font-medium text-text mt-4 mb-3">MRZ Parsed Fields</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(data.mrz.parsedFields).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-text">{key}</span>
                  <span className="font-mono text-text">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ValidationResultsView({ results }: { results: any }) {
  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>Document Validation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-panel-secondary rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-success">{results.passed}</p>
            <p className="text-sm text-muted-text">Passed</p>
          </div>
          <div className="bg-panel-secondary rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-warning">{results.warnings}</p>
            <p className="text-sm text-muted-text">Warnings</p>
          </div>
          <div className="bg-panel-secondary rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-danger">{results.failed}</p>
            <p className="text-sm text-muted-text">Failed</p>
          </div>
        </div>

        <div className="space-y-2">
          {results.checks?.map((check: any) => (
            <div
              key={check.id}
              className={cn('flex items-center gap-3 p-3 bg-panel-secondary rounded-lg border', 
                check.status === 'pass' && 'border-success/30',
                check.status === 'warning' && 'border-warning/30',
                check.status === 'fail' && 'border-danger/30',
                check.status === 'not_checked' && 'border-border/50'
              )}
            >
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
  );
}

function TamperingResultsView({ results }: { results: any }) {
  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>Tampering & Forensic Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-text mb-3">Document View</h4>
            <div className="bg-panel-secondary rounded-lg p-4 min-h-[300px] flex items-center justify-center relative">
              <span className="text-muted-text">Forensic overlay would appear here</span>
              <div className="absolute bottom-2 right-2 text-xs text-muted-text bg-background/80 px-2 py-1 rounded">
                AI analysis — demonstration data
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              {['Original', 'Forensic Overlay', 'Heatmap', 'Anomaly Regions'].map(view => (
                <Button key={view} variant="ghost" size="sm" className="text-xs">{view}</Button>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-medium text-text mb-3">Analysis Results</h4>
            <div className="space-y-3 mb-6">
              {results.findings?.map((finding: any) => (
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
                <Badge variant={results.overallStatus === 'clean' ? 'success' : results.overallStatus === 'suspicious' ? 'warning' : 'danger'} size="lg">
                  {results.overallScore}%
                </Badge>
              </div>
              <Progress value={results.overallScore} max={100} size="md" variant={
                results.overallStatus === 'clean' ? 'success' :
                results.overallStatus === 'suspicious' ? 'warning' : 'danger'
              } />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FaceVerificationView({ results }: { results: any }) {
  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>Face Verification</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="font-medium text-text mb-3">Document Face</h4>
            <div className="bg-panel-secondary rounded-lg p-4 min-h-[250px] flex items-center justify-center relative">
              <span className="text-muted-text">Document face crop</span>
              {results.documentFace.boundingBox && (
                <div className="absolute border-2 border-primary-accent" style={{
                  left: `${results.documentFace.boundingBox.x * 100}%`,
                  top: `${results.documentFace.boundingBox.y * 100}%`,
                  width: `${results.documentFace.boundingBox.width * 100}%`,
                  height: `${results.documentFace.boundingBox.height * 100}%`,
                }} />
              )}
            </div>
            <p className="text-sm text-muted-text mt-2">Quality: {results.documentFace.qualityScore}%</p>
          </div>
          <div>
            <h4 className="font-medium text-text mb-3">Presented Person</h4>
            <div className="bg-panel-secondary rounded-lg p-4 min-h-[250px] flex items-center justify-center relative">
              <span className="text-muted-text">Live capture would appear here</span>
              {results.presentedFace.boundingBox && (
                <div className="absolute border-2 border-primary-accent" style={{
                  left: `${results.presentedFace.boundingBox.x * 100}%`,
                  top: `${results.presentedFace.boundingBox.y * 100}%`,
                  width: `${results.presentedFace.boundingBox.width * 100}%`,
                  height: `${results.presentedFace.boundingBox.height * 100}%`,
                }} />
              )}
            </div>
            <p className="text-sm text-muted-text mt-2">Quality: {results.presentedFace.qualityScore}%</p>
            <p className="text-sm text-muted-text">Liveness: {results.presentedFace.livenessStatus.replace('_', ' ')}</p>
          </div>
        </div>

        <div className="bg-panel-secondary rounded-lg p-6 text-center">
          <div className="text-5xl font-bold mb-2" style={{ color: results.decision === 'match' ? '#22C55E' : '#EF4444' }}>
            {results.similarity.toFixed(1)}%
          </div>
          <Badge variant={results.decision === 'match' ? 'success' : 'danger'} size="lg">
            {results.decision === 'match' ? 'MATCH' : 'MISMATCH'}
          </Badge>
          <p className="text-sm text-muted-text mt-2">Threshold: {results.threshold}%</p>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="bg-panel-secondary rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-text">{results.documentFace.qualityScore}%</p>
            <p className="text-sm text-muted-text">Document Face Quality</p>
          </div>
          <div className="bg-panel-secondary rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-text">{results.presentedFace.qualityScore}%</p>
            <p className="text-sm text-muted-text">Presented Face Quality</p>
          </div>
          <div className="bg-panel-secondary rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-text">{results.similarity.toFixed(1)}%</p>
            <p className="text-sm text-muted-text">Similarity Score</p>
          </div>
          <div className="bg-panel-secondary rounded-lg p-4 text-center">
            <Badge variant={results.decision === 'match' ? 'success' : 'danger'} size="md">
              {results.decision.toUpperCase()}
            </Badge>
            <p className="text-sm text-muted-text mt-1">Decision</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RiskAssessmentView({ result }: { result: any }) {
  const riskColor = result.level === 'high' ? '#EF4444' : result.level === 'review' ? '#F59E0B' : '#22C55E';

  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>Risk Assessment</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative mb-6">
              <svg width="160" height="160" className="transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="#263244"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke={riskColor}
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={439.8}
                  strokeDashoffset={439.8 - (result.score / 100) * 439.8}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-text">{result.score}</span>
                <span className="text-muted-text">/ 100</span>
                <Badge variant={result.level === 'high' ? 'danger' : result.level === 'review' ? 'warning' : 'success'} size="lg" className="mt-2">
                  {result.level.toUpperCase()} RISK
                </Badge>
              </div>
            </div>
            <p className="text-center text-muted-text">AI-assisted risk scoring based on multi-factor analysis</p>
          </div>

          <div>
            <h4 className="font-medium text-text mb-4">Risk Contributors</h4>
            <div className="space-y-3">
              {result.contributors?.map((contributor: any) => (
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
            {result.explanation?.map((exp: string, i: number) => (
              <div key={i} className="flex gap-3 p-3 bg-panel-secondary rounded-lg">
                <span className="text-primary-accent font-mono">{i + 1}.</span>
                <p className="text-text flex-1">{exp}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FinalResultView({
  riskResult,
  extractedData,
  validationResults,
  tamperingResults,
  faceResults,
}: { riskResult: any; extractedData: any; validationResults: any; tamperingResults: any; faceResults: any }) {
  const riskColor = riskResult.level === 'high' ? '#EF4444' : riskResult.level === 'review' ? '#F59E0B' : '#22C55E';

  return (
    <div className="space-y-6">
      <Card padding="lg" className="border-2" style={{ borderColor: riskColor }}>
        <CardContent className="pt-0">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-muted-text">SCREENING RESULT</span>
                <Badge variant={riskResult.level === 'high' ? 'danger' : riskResult.level === 'review' ? 'warning' : 'success'} size="md">
                  {riskResult.level.toUpperCase()} RISK
                </Badge>
              </div>
              <p className="text-lg font-mono text-text">Case ID: ID-2026-001</p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold" style={{ color: riskColor }}>{riskResult.score}</div>
              <div className="text-muted-text">/ 100</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'OCR', status: extractedData ? 'completed' : 'pending', icon: FileText },
              { label: 'Validation', status: validationResults?.overallStatus === 'pass' ? 'pass' : validationResults?.overallStatus === 'fail' ? 'fail' : 'warning', icon: CheckCircle },
              { label: 'Tampering', status: tamperingResults?.overallStatus === 'clean' ? 'pass' : tamperingResults?.overallStatus === 'suspicious' ? 'warning' : 'fail', icon: AlertCircle },
              { label: 'Face', status: faceResults?.decision === 'match' ? 'pass' : 'fail', icon: AlertCircle },
              { label: 'Database', status: 'backend_required', icon: AlertCircle },
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

          <div className={cn('p-4 rounded-lg text-center', riskResult.recommendation === 'clear' ? 'bg-success/20' : riskResult.recommendation === 'secondary_inspection' ? 'bg-warning/20' : 'bg-danger/20')}>
            <p className="font-medium text-lg">Recommended Action:</p>
            <p className="text-xl font-bold mt-1" style={{ color: riskColor }}>
              {riskResult.recommendation.replace('_', ' ').toUpperCase()}
            </p>
            <p className="text-sm text-muted-text mt-2">
              This is an AI-assisted recommendation. Final determination requires human operator review.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card padding="lg">
        <CardHeader>
          <CardTitle>Evidence Summary</CardTitle>
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
                {riskResult.explanation?.map((exp: string, i: number) => (
                  <div key={i} className="p-3 bg-panel-secondary rounded-lg border border-border/50 flex items-start gap-3">
                    <span className="text-primary-accent font-mono mt-0.5">{i + 1}.</span>
                    <p className="text-text flex-1">{exp}</p>
                  </div>
                ))}
              </div>
            </TabContent>
            <TabContent value="original">
              <div className="text-center py-8 text-muted-text">Original document view</div>
            </TabContent>
            <TabContent value="ocr">
              <div className="text-center py-8 text-muted-text">OCR extraction details</div>
            </TabContent>
            <TabContent value="validation">
              <div className="text-center py-8 text-muted-text">Validation checklist</div>
            </TabContent>
            <TabContent value="tampering">
              <div className="text-center py-8 text-muted-text">Forensic analysis details</div>
            </TabContent>
            <TabContent value="face">
              <div className="text-center py-8 text-muted-text">Face verification details</div>
            </TabContent>
            <TabContent value="metadata">
              <div className="text-center py-8 text-muted-text">Document metadata</div>
            </TabContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={() => { window.location.href = '/cases'; }}>Back to Cases</Button>
        <Button variant="primary" onClick={() => {}}>Generate Report</Button>
      </div>
    </div>
  );
}