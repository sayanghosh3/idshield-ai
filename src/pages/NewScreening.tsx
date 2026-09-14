import { createDemoRun, demoStepOperation } from '../services/demoWorkflow';
import { DocumentPreview } from '../components/common/DocumentPreview';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, X, CheckCircle, AlertCircle, Loader2, FileText, Image, Upload, RotateCcw, ZoomIn, ZoomOut, Maximize2, Minimize2, Shield } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Progress, StepProgress } from '../components/common/Progress';
import { Tabs, TabsList, TabTrigger, TabContent } from '../components/common/Tabs';
import { Modal } from '../components/common/Modal';
import { useFileUpload, useImageTransform } from '../hooks/useFileUpload';
import { useScreening } from '../hooks/useScreening';
import { useDemoMode } from '../hooks/useDemoMode';
import { caseRepository } from '../services/caseRepository';
import { createScreeningRunner } from '../services/screeningRun';
import { STEP_ORDER, initialStepStatuses, hasCompleteResult, withoutResults, faceOutcome } from '../utils/screeningStatus';
import { demoDocuments, allowedFileTypes, maxFileSize, screeningSteps, createDemoCase } from '../services/demoCatalog';
import type { ScreeningStep, ScreeningCase, DocumentFile } from '../types';
import { formatFileSize, formatRelativeTime, getRiskLevelLabel } from '../utils/formatters';
import { FadeIn, StaggerContainer, AnimatedNumber, AnimatedStatus } from '../components/animations';


const SELFIE_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
function inputDocument(file: File): DocumentFile {
  return { id: crypto.randomUUID(), name: file.name, size: file.size, type: file.type,
    preview: URL.createObjectURL(file), documentType: 'other', uploadedAt: new Date() };
}
export function NewScreening() {
  const location = useLocation();
  const handoff = useRef(location.state as { documentFiles?: File[]; selfieFiles?: File[] } | null);
  const [liveness, setLiveness] = useState<'live' | 'spoof' | 'unknown'>('live');
  const navigate: ReturnType<typeof useNavigate> = useNavigate();
  const {
    currentCase,
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
    setError,
    resetScreening,
    loadDemoScenario,
  } = useScreening();

  const { enabled: demoEnabled, setEnabled, activeScenario, setActiveScenario, scenarios } = useDemoMode();
  const [activeTab, setActiveTab] = useState('upload');
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const runner = useRef(createScreeningRunner());
  const mounted = useRef(false);
  const running = useRef(false);
  const stepStatuses = currentCase?.stepStatuses ?? initialStepStatuses();
  const completedSteps = STEP_ORDER.filter(step => stepStatuses[step] === 'completed');


  const {
    files,
    errors,
    isDragging,
    isUploading,
    fileInputRef,
    addFiles,
    removeFile: removeUploadedFile,
    clearFiles,
    uploadSelectedFiles,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    openFileDialog,
  } = useFileUpload(allowedFileTypes, maxFileSize);

  const selfie = useFileUpload(SELFIE_TYPES, maxFileSize);
  const addSelfies = selfie.addFiles;
  const clearSelfies = selfie.clearFiles;
  useEffect(() => {
    mounted.current = true;
    resetScreening();
    clearFiles();
    clearSelfies();
    if (handoff.current?.documentFiles?.every(file => file instanceof File)) addFiles(handoff.current.documentFiles);
    if (handoff.current?.selfieFiles?.every(file => file instanceof File)) addSelfies(handoff.current.selfieFiles);
    const activeRunner = runner.current;
    return () => { mounted.current = false; activeRunner.cancel(); };
  }, [resetScreening, clearFiles, clearSelfies, addFiles, addSelfies]);

  const currentStepIndex = STEP_ORDER.indexOf(currentStep);
  const isStepCompleted = (step: ScreeningStep) => stepStatuses[step] === 'completed';
  const getStepStatus = (step: ScreeningStep) => stepStatuses[step];

  const handleDemoSelect = useCallback((scenarioId: string) => {
    if (running.current) return;
    const demoCase = withoutResults(createDemoCase(scenarioId));
    clearFiles();
    clearSelfies();
    loadDemoScenario(demoCase);
    setEnabled(true);
    setActiveScenario(scenarioId);
    setActiveTab('upload');
    setShowDemoModal(false);
  }, [clearFiles, clearSelfies, loadDemoScenario, setEnabled, setActiveScenario]);

  const handleStartScreening = useCallback(async () => {
    if (running.current) return;

    const scenario = demoEnabled ? activeScenario : null;

    if (!files.length && !scenario) {
      setError('Please upload a document or select a demo scenario');
      return;
    }

    if (scenario && files.length && !selfie.files[0]) {
      setError('Add a selfie or choose a sample pair.');
      return;
    }

    running.current = true;
    setIsProcessing(true);
    setError(null);
    setActiveTab('upload');

    try {
      // Upload real documents when the user is not running a demo scenario.
      // The existing screening engine is still used below for the analysis
      // stages until those backend endpoints are implemented.
      let uploadedBackendFiles: Awaited<ReturnType<typeof uploadSelectedFiles>> = [];

      if (!scenario && files.length > 0) {
        uploadedBackendFiles = await uploadSelectedFiles();

        if (uploadedBackendFiles.length === 0) {
          throw new Error(
            'Document upload failed. Please check the backend connection.'
          );
        }
      }

      const template = scenario ? createDemoCase(scenario) : null;
      const identity = crypto.randomUUID();
      const now = new Date();

      const record: ScreeningCase = scenario
        ? createDemoRun(
            scenario,
            files.map(inputDocument),
            selfie.files[0] ? inputDocument(selfie.files[0]) : undefined,
            liveness
          )
        : {
            ...(template ? withoutResults(template) : {}),
            id: `case-${identity}`,
            caseNumber: `ID-${now.getFullYear()}-${identity.toUpperCase()}`,
            subjectName: template?.subjectName ?? 'Not extracted',
            documentType: template?.documentType ?? 'other',
            documents: template?.documents ?? files.map((file, index) => {
              const uploaded = uploadedBackendFiles[index];

              return {
                id: uploaded?.id ?? `doc-${identity}-${index}`,
                name: uploaded?.name ?? file.name,
                type: uploaded?.type ?? file.type,
                size: uploaded?.size ?? file.size,
                preview: URL.createObjectURL(file),
                documentType: 'other' as const,
                uploadedAt: uploaded
                  ? new Date(uploaded.uploadedAt)
                  : now,
              };
            }),
            status: 'draft',
            riskLevel: 'unknown',
            riskScore: null,
            currentStep: 'upload',
            stepStatuses: initialStepStatuses(),
            createdAt: now,
            updatedAt: now,
            tags: template ? ['demo'] : ['unassessed'],
          };

      const reported = new Set<string>();

      // Keep the current screening runner for now. Its analysis stages are
      // still demo/simulated until the real OCR, validation, forensics,
      // face, and risk endpoints are connected.
      const result = await runner.current.run(
        record,
        demoStepOperation(),
        update => {
          update = {
            ...update,
            caseStatus: update.status === 'completed'
              ? 'under_review'
              : 'open',
          };

          caseRepository.upsert(update);

          for (const step of STEP_ORDER) {
            const status = update.stepStatuses![step];
            const key = `${step}:${status}`;

            if (
              !['completed', 'failed', 'skipped'].includes(status) ||
              reported.has(key)
            ) {
              continue;
            }

            reported.add(key);

            caseRepository.addAudit({
              id: crypto.randomUUID(),
              caseId: update.id,
              timestamp: new Date(),
              event: `${step.replaceAll('_', ' ')} ${status}`,
              category: 'system',
              status: status === 'completed'
                ? 'success'
                : status === 'failed'
                  ? 'error'
                  : 'warning',
              actor: template ? 'Demo Engine' : 'Screening Engine',
              actorType: 'system',
            });
          }

          if (mounted.current) {
            loadDemoScenario(update);
          }
        }
      );

      if (mounted.current) {
        if (result.status === 'completed') {
          navigate('/screening/result/' + result.id, { replace: true });
          return;
        }

        setActiveTab('result');

        if (result.status === 'incomplete') {
          setError('Screening cancelled. No final result is available.');
        }
      }
    } catch (err) {
      if (mounted.current) {
        setError(
          err instanceof Error
            ? err.message
            : 'Screening failed. Please try again.'
        );
      }
    } finally {
      running.current = false;

      if (mounted.current) {
        setIsProcessing(false);
      }
    }
  }, [
    files,
    selfie.files,
    activeScenario,
    demoEnabled,
    liveness,
    loadDemoScenario,
    setError,
    navigate,
    uploadSelectedFiles,
  ]);

  const handleReset = useCallback(() => {
    runner.current.cancel();
    resetScreening();
    clearFiles();
    clearSelfies();
    setActiveTab('upload');
    setActiveScenario(null);
    setError(null);
  }, [resetScreening, clearFiles, clearSelfies, setActiveScenario, setError]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <FadeIn>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-text">New Screening</h1>
              <p className="text-muted-text">Multi-step AI-powered document screening workflow</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {demoEnabled && activeScenario && (
              <Badge variant="info" className="gap-1">
                <span className="w-2 h-2 rounded-full bg-primary-accent" />
                {scenarios.find(s => s.id === activeScenario)?.name}
              </Badge>
            )}
            <Button variant="ghost" disabled={isProcessing} onClick={() => setShowDemoModal(true)}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Demo Scenarios
            </Button>
            <Button variant="secondary" onClick={handleReset} disabled={isProcessing}>
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <StepProgress
          steps={screeningSteps.map(s => s.label)}
          currentStep={currentStepIndex}
          completedSteps={completedSteps.map(s => STEP_ORDER.indexOf(s))}
          statuses={STEP_ORDER.map(step => stepStatuses[step])}
          className="mb-6"
        />
      </FadeIn>

      <FadeIn delay={0.15}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="min-w-0 lg:col-span-2 space-y-6">
            <Tabs defaultValue="upload" value={activeTab} onChange={setActiveTab} variant="enclosed">
              <TabsList className="flex gap-1 bg-panel-secondary p-1 rounded-lg" aria-label="Screening steps">
                {screeningSteps.map((step, index) => {
                  const status = getStepStatus(step.step);
                  return (
                    <TabTrigger
                      key={step.step}
                      value={step.step}
                      disabled={index > currentStepIndex && !isStepCompleted(step.step) && !demoEnabled}
                      className={cn(
                        'py-2 px-3 text-xs font-medium transition-all duration-200',
                        status === 'completed' && 'bg-success text-white',
                        status === 'processing' && 'bg-primary-accent text-background',
                        status === 'pending' && 'text-muted-text'
                      )}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <AnimatedStatus status={status} />
                        <span>{step.label}</span>
                      </div>
                    </TabTrigger>
                  );
                })}
              </TabsList>

            <TabContent value="upload">
              <FadeIn>
                <Card padding="lg">
                  <CardHeader>
                    <CardTitle>Document Upload</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 mb-5">
                      <Badge variant="warning">SIH DEMO — No government database access</Badge>
                      <p className="text-sm text-muted-text">Choose a sample pair, or upload a document and selfie and select a scenario. OCR, MRZ checks, tampering, face comparison and liveness are simulated from that scenario, not measured from your uploads. Inputs stay in this browser session. Use sample data only.</p>
                      <label className="block label">Simulation scenario
                        <select className="input mt-1" disabled={isProcessing} value={demoEnabled ? activeScenario ?? '' : ''} onChange={event => {
                          const id = event.target.value;
                          resetScreening(); setEnabled(!!id); setActiveScenario(id || null);
                          if (id && !files.length) loadDemoScenario(withoutResults(createDemoCase(id)));
                        }}>
                          <option value="">No simulation — real analysis unavailable</option>
                          {scenarios.map(scenario => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}
                        </select>
                      </label>
                      <label className="block label">Selfie input (PNG or JPEG)
                        <input className="input mt-1" type="file" accept={SELFIE_TYPES.join(',')} disabled={isProcessing} onChange={event => { resetScreening(); clearSelfies(); selfie.handleFileSelect(event); }} />
                      </label>
                      <p className="text-sm text-muted-text">{selfie.files[0]?.name ?? (demoEnabled && activeScenario && !files.length ? 'Using the selected sample selfie paired with the sample document.' : 'Add a selfie for an uploaded document.')}</p>
                      {Object.values(selfie.errors).map(message => <p key={message} role="alert" className="text-danger text-sm">{message}</p>)}
                      <label className="block label">Simulated liveness outcome
                        <select className="input mt-1" disabled={isProcessing} value={liveness} onChange={event => setLiveness(event.target.value as typeof liveness)}>
                          <option value="live">Live — simulated</option><option value="spoof">Spoof attempt — simulated</option><option value="unknown">Inconclusive — simulated</option>
                        </select>
                      </label>
                    </div>
                    <motion.div
                      className={cn(
                        'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
                        isDragging ? 'border-primary-accent bg-primary-accent/5' : 'border-border hover:border-primary-accent/50'
                      )}
                      onKeyDown={event => { if (!running.current && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openFileDialog(); } }}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={event => { if (running.current) event.preventDefault(); else { resetScreening(); setActiveTab('upload'); handleDrop(event); } }}
                      onClick={() => { if (!running.current) { resetScreening(); setActiveTab('upload'); openFileDialog(); } }}
                      role="button"
                      tabIndex={0}
                      aria-label="Drop zone for document upload"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      transition={{ duration: 0.15 }}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={allowedFileTypes.join(',')}
                        onClick={event => event.stopPropagation()}
                        onChange={event => { if (!running.current) handleFileSelect(event); }}
                        className="hidden"
                        aria-hidden="true"
                      />
                      <Upload className="w-12 h-12 mx-auto text-muted-text mb-4" />
                      <p className="text-lg font-medium text-text mb-1">Drag & drop document here</p>
                      <p className="text-sm text-muted-text mb-4">or click to browse</p>
                      <p className="text-xs text-muted-text">Supported: PNG, JPG, JPEG, PDF • Max 10MB</p>
                    </motion.div>

                    {errors && Object.keys(errors).length > 0 && (
                      <FadeIn delay={0.1} y={8}>
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
                      </FadeIn>
                    )}

                    {(files.length > 0 || uploadedDocuments.length > 0) && (
                      <FadeIn delay={0.1} y={8}>
                        <div className="mt-6 space-y-3">
                          <h4 className="font-medium text-text">Uploaded Documents</h4>
                          <StaggerContainer staggerChildren={0.05}>
                            <div className="space-y-2">
                              {files.map((file, index) => (
                                <FadeIn key={index} y={4}>
                                  <div className="flex items-center gap-4 p-3 bg-panel-secondary rounded-lg border border-border">
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
                                    <Button variant="ghost" size="sm" disabled={isProcessing} onClick={() => { resetScreening(); removeUploadedFile(index); }}>
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </FadeIn>
                              ))}
                              {files.length === 0 && uploadedDocuments.map(doc => (
                                <FadeIn key={doc.id} y={4}>
                                  <div className="flex items-center gap-4 p-3 bg-panel-secondary rounded-lg border border-border">
                                    <DocumentPreview document={doc} className="w-24 min-h-16" />
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-text truncate">{doc.name}</p>
                                      <p className="text-xs text-muted-text">{formatFileSize(doc.size)} • {doc.documentType}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" disabled={isProcessing} onClick={() => { handleReset(); }}>
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </FadeIn>
                              ))}
                            </div>
                          </StaggerContainer>
                        </div>
                      </FadeIn>
                    )}

                    <FadeIn delay={0.2} y={8}>
                      <div className="mt-6 pt-6 border-t border-border">
                        <h4 className="font-medium text-text mb-3">Sample Document / Selfie Pairs</h4>
                        <StaggerContainer staggerChildren={0.05}>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Object.entries(demoDocuments).map(([key, doc]) => (
                              <FadeIn key={key} y={4}>
                                <motion.button
                                  onClick={() => handleDemoSelect(key)}
                                  disabled={isProcessing}
                                  className="flex items-center gap-3 p-3 bg-panel-secondary rounded-lg border border-border hover:border-primary-accent/50 transition-colors text-left"
                                  whileHover={{ x: 4 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  <FileText className="w-10 h-10 text-muted-text" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-text truncate">{doc.name.replace('Passport_', '').replace('.pdf', '').replace(/_/g, ' ')}</p>
                                    <p className="text-xs text-muted-text">Demo • {formatFileSize(doc.size)}</p>
                                  </div>
                                  <ArrowRight className="w-4 h-4 text-muted-text" />
                                  </motion.button>
                                </FadeIn>
                            ))}
                          </div>
                        </StaggerContainer>
                      </div>
                    </FadeIn>
                  </CardContent>
                </Card>
              </FadeIn>
            </TabContent>

            <TabContent value="extraction">
              <FadeIn>
                {extractedData ? (
                  <OCRResultsView data={extractedData} />
                ) : (
                  <div className="text-center py-12 text-muted-text">
                    <AnimatedStatus status={stepStatuses.extraction}>{stepStatuses.extraction}</AnimatedStatus>
                    <p>Run screening to extract OCR data</p>
                  </div>
                )}
              </FadeIn>
            </TabContent>

            <TabContent value="validation">
              <FadeIn>
                {validationResults ? (
                  <ValidationResultsView results={validationResults} />
                ) : (
                  <div className="text-center py-12 text-muted-text">
                    <AnimatedStatus status={stepStatuses.validation}>{stepStatuses.validation}</AnimatedStatus>
                    <p>Run screening to validate document</p>
                  </div>
                )}
              </FadeIn>
            </TabContent>

            <TabContent value="forensics">
              <FadeIn>
                {tamperingResults ? (
                  <TamperingResultsView results={tamperingResults} />
                ) : (
                  <div className="text-center py-12 text-muted-text">
                    <AnimatedStatus status={stepStatuses.forensics}>{stepStatuses.forensics}</AnimatedStatus>
                    <p>Run screening for tampering analysis</p>
                  </div>
                )}
              </FadeIn>
            </TabContent>

            <TabContent value="face_verification">
              <FadeIn>
                {faceResults ? (
                  <FaceVerificationView results={faceResults} />
                ) : (
                  <div className="text-center py-12 text-muted-text">
                    <AnimatedStatus status={stepStatuses.face_verification}>{stepStatuses.face_verification}</AnimatedStatus>
                    <p>Run screening for face verification</p>
                  </div>
                )}
              </FadeIn>
            </TabContent>

            <TabContent value="risk_assessment">
              <FadeIn>
                {riskResult ? (
                  <RiskAssessmentView result={riskResult} />
                ) : (
                  <div className="text-center py-12 text-muted-text">
                    <AnimatedStatus status={stepStatuses.risk_assessment}>{stepStatuses.risk_assessment}</AnimatedStatus>
                    <p>Run screening for risk assessment</p>
                  </div>
                )}
              </FadeIn>
            </TabContent>

            <TabContent value="result">
              <FadeIn>
                {currentCase && hasCompleteResult(currentCase) && riskResult ? (
                  <FinalResultView caseId={currentCase!.id} caseNumber={currentCase!.caseNumber}
                    riskResult={riskResult}
                    extractedData={extractedData}
                    validationResults={validationResults}
                    tamperingResults={tamperingResults}
                    faceResults={faceResults}
                  />
                ) : (
                  <div className="text-center py-12 text-muted-text">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-text" />
                    <p className="text-lg font-medium">No final result available</p>
                    <p className="text-muted-text mt-1">Results will appear here after screening completes</p>
                  </div>
                )}
              </FadeIn>
            </TabContent>
          </Tabs>
        </div>

        <FadeIn delay={0.2}>
          <StaggerContainer staggerChildren={0.08} delayChildren={0.1}>
            <div className="space-y-6">
              <FadeIn y={8}>
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
              </FadeIn>

              <FadeIn y={8}>
                <Card padding="md">
                  <CardHeader>
                    <CardTitle>Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isProcessing && <Button variant="secondary" onClick={() => runner.current.cancel()}>Cancel Screening</Button>}
                    <Button
                      variant="primary"
                      className="w-full justify-center gap-2"
                      onClick={handleStartScreening}
                      disabled={isProcessing || isUploading || (files.length === 0 && !activeScenario)}
                      loading={isProcessing || isUploading}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      {isProcessing || isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                      {isUploading
                        ? 'Uploading...'
                        : isProcessing
                          ? 'Processing...'
                          : 'Start Screening'}
                    </Button>
                    <Button variant="ghost" className="w-full justify-center" disabled={isProcessing} onClick={() => setShowDemoModal(true)} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      Load Demo Scenario
                    </Button>
                  </CardContent>
                </Card>
              </FadeIn>

              {uploadedDocuments.length > 0 && (
                <FadeIn y={8}>
                  <Card padding="md">
                    <CardHeader>
                      <CardTitle>Document Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ImagePreviewer key={currentCase?.id ?? 'upload'}
                        documents={uploadedDocuments}
                        onImageSelect={(doc) => {
                          if (doc.preview.startsWith('blob:')) {
                            addDocument(doc);
                          }
                        }}
                      />
                    </CardContent>
                  </Card>
                </FadeIn>
              )}
            </div>
          </StaggerContainer>
        </FadeIn>
      </div>
      </FadeIn>

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
            <FileText className="w-16 h-12 text-muted-text" />
          </button>
        ))}
      </div>
      <div className="relative bg-panel-secondary rounded-lg overflow-hidden min-h-[300px] flex items-center justify-center">
        <div className="relative" style={transformStyle}>
          <DocumentPreview document={selectedDoc} className="max-w-full max-h-[500px] object-contain" />
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
          <div className="text-5xl font-bold mb-2" style={{ color: results.decision === 'match' ? '#22C55E' : results.decision === 'mismatch' ? '#EF4444' : '#94A3B8' }}>
            {results.similarity.toFixed(1)}%
          </div>
          <Badge variant={results.decision === 'match' ? 'success' : results.decision === 'mismatch' ? 'danger' : 'neutral'} size="lg">
            {results.decision?.toUpperCase() ?? 'NOT CHECKED'}
          </Badge>
          <p className="text-sm text-muted-text mt-2">Threshold: {results.threshold}%</p>
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
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
            <Badge variant={results.decision === 'match' ? 'success' : results.decision === 'mismatch' ? 'danger' : 'neutral'} size="md">
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
              <motion.svg width="160" height="160" className="transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="#263244"
                  strokeWidth="12"
                  fill="none"
                />
                <motion.circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke={riskColor}
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={439.8}
                  initial={{ strokeDashoffset: 439.8 }}
                  animate={{ strokeDashoffset: 439.8 - (result.score / 100) * 439.8 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  strokeLinecap="round"
                />
              </motion.svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <AnimatedNumber value={result.score} maxValue={100} duration={0.8} className="text-4xl font-bold text-text" />
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
            <StaggerContainer staggerChildren={0.06}>
              {result.contributors?.map((contributor: any) => (
                <FadeIn key={contributor.id} y={8}>
                  <div className="bg-panel-secondary rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-text">{contributor.factor}</span>
                      <Badge variant={contributor.type === 'positive' ? 'success' : 'danger'} size="sm">
                        {contributor.type === 'positive' ? '+' : ''}{contributor.impact}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-text mb-3">{contributor.description}</p>
                    <div className="h-2 bg-panel rounded-full overflow-hidden">
                      <motion.div
                        className={cn('h-full rounded-full', contributor.type === 'positive' ? 'bg-success' : 'bg-danger')}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.abs(contributor.impact) * 2}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
                      />
                    </div>
                  </div>
                </FadeIn>
              ))}
            </StaggerContainer>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <h4 className="font-medium text-text mb-4">Explainable AI — Why was this case flagged?</h4>
          <StaggerContainer staggerChildren={0.05}>
            {result.explanation?.map((exp: string, i: number) => (
              <FadeIn key={i} y={4}>
                <div className="flex gap-3 p-3 bg-panel-secondary rounded-lg">
                  <span className="text-primary-accent font-mono">{i + 1}.</span>
                  <p className="text-text flex-1">{exp}</p>
                </div>
              </FadeIn>
            ))}
          </StaggerContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function FinalResultView({
  caseId,
  caseNumber,
  riskResult,
  extractedData,
  validationResults,
  tamperingResults,
  faceResults,
}: { caseId: string; caseNumber: string; riskResult: any; extractedData: any; validationResults: any; tamperingResults: any; faceResults: any }) {
  const navigate = useNavigate();
  const riskColor = riskResult.level === 'high' ? '#EF4444' : riskResult.level === 'review' ? '#F59E0B' : '#22C55E';

  return (
    <FadeIn>
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
                <p className="text-lg font-mono text-text">Case ID: {caseNumber}</p>
              </div>
              <div className="text-right">
                <AnimatedNumber value={riskResult.score} maxValue={100} duration={0.8} className="text-5xl font-bold" style={{ color: riskColor }} />
                <div className="text-muted-text">/ 100</div>
              </div>
            </div>

            <StaggerContainer staggerChildren={0.06}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                {[
                  { label: 'OCR', status: extractedData ? 'completed' : 'pending', icon: FileText },
                  { label: 'Validation', status: validationResults?.overallStatus === 'pass' ? 'pass' : validationResults?.overallStatus === 'fail' ? 'fail' : 'warning', icon: CheckCircle },
                  { label: 'Tampering', status: tamperingResults?.overallStatus === 'clean' ? 'pass' : tamperingResults?.overallStatus === 'suspicious' ? 'warning' : 'fail', icon: AlertCircle },
                  { label: 'Face', status: faceOutcome(faceResults), icon: AlertCircle },
                  { label: 'Database', status: 'backend_required', icon: AlertCircle },
                ].map((item, i) => (
                  <FadeIn key={i} y={8}>
                    <div className="bg-panel-secondary rounded-lg p-4 text-center">
                      <item.icon className="w-6 h-6 mx-auto mb-2 text-primary-accent" />
                      <p className="font-medium text-text">{item.label}</p>
                      <Badge variant={
                        item.status === 'completed' || item.status === 'pass' ? 'success' :
                        item.status === 'warning' ? 'warning' :
                        item.status === 'fail' ? 'danger' : 'info'
                      } size="sm">{item.status.replace('_', ' ').toUpperCase()}</Badge>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </StaggerContainer>

            <FadeIn y={8}>
              <div className={cn('p-4 rounded-lg text-center', riskResult.recommendation === 'clear' ? 'bg-success/20' : riskResult.recommendation === 'secondary_inspection' ? 'bg-warning/20' : 'bg-danger/20')}>
                <p className="font-medium text-lg">Recommended Action:</p>
                <p className="text-xl font-bold mt-1" style={{ color: riskColor }}>
                  {riskResult.recommendation.replace('_', ' ').toUpperCase()}
                </p>
                <p className="text-sm text-muted-text mt-2">
                  This is an AI-assisted recommendation. Final determination requires human operator review.
                </p>
              </div>
            </FadeIn>
          </CardContent>
        </Card>

        <FadeIn delay={0.1} y={16}>
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
                  <StaggerContainer staggerChildren={0.05}>
                    {riskResult.explanation?.map((exp: string, i: number) => (
                      <FadeIn key={i} y={4}>
                        <div className="p-3 bg-panel-secondary rounded-lg border border-border/50 flex items-start gap-3">
                          <span className="text-primary-accent font-mono mt-0.5">{i + 1}.</span>
                          <p className="text-text flex-1">{exp}</p>
                        </div>
                      </FadeIn>
                    ))}
                  </StaggerContainer>
                </TabContent>
                <TabContent value="original">
                  <FadeIn>
                    <div className="text-center py-8 text-muted-text">Original document view</div>
                  </FadeIn>
                </TabContent>
                <TabContent value="ocr">
                  <FadeIn>
                    <div className="text-center py-8 text-muted-text">OCR extraction details</div>
                  </FadeIn>
                </TabContent>
                <TabContent value="validation">
                  <FadeIn>
                    <div className="text-center py-8 text-muted-text">Validation checklist</div>
                  </FadeIn>
                </TabContent>
                <TabContent value="tampering">
                  <FadeIn>
                    <div className="text-center py-8 text-muted-text">Forensic analysis details</div>
                  </FadeIn>
                </TabContent>
                <TabContent value="face">
                  <FadeIn>
                    <div className="text-center py-8 text-muted-text">Face verification details</div>
                  </FadeIn>
                </TabContent>
                <TabContent value="metadata">
                  <FadeIn>
                    <div className="text-center py-8 text-muted-text">Document metadata</div>
                  </FadeIn>
                </TabContent>
              </Tabs>
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => navigate('/cases')} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>Back to Cases</Button>
            <Button variant="primary" onClick={() => navigate(`/cases/${caseId}`)} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>View Case Details</Button>
          </div>
        </FadeIn>
      </div>
    </FadeIn>
  );
}
