import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCases } from '../hooks/useCases';
import { DemoCaseContext } from '../components/common/DemoCaseContext';
import { DocumentPreview } from '../components/common/DocumentPreview';
import { useState } from 'react';
import { motion } from 'motion/react';
import { Upload, RotateCcw, Eye, CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from '../components/common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Progress } from '../components/common/Progress';
import { useFileUpload, useImagePreview } from '../hooks/useFileUpload';
import { FadeIn, StaggerContainer, AnimatedNumber } from '../components/animations';

export function FaceVerification() {
  const [documentImage, setDocumentImage] = useState<File | null>(null);
  const [presentedImage, setPresentedImage] = useState<File | null>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { cases } = useCases();
  const selectedCase = cases.find(record => record.id === searchParams.get('caseId'));
  const result = selectedCase?.faceResult;
  const isProcessing = false;

  const {
    files: docFiles,
    addFiles: addDocFiles,
    removeFile: removeDocFile,
    clearFiles: clearDocFiles,
    handleDragOver: handleDocDragOver,
    handleDragLeave: handleDocDragLeave,
    handleDrop: handleDocDrop,
    handleFileSelect: handleDocFileSelect,
    openFileDialog: openDocFileDialog,
    fileInputRef: docFileInputRef,
    errors: docErrors,
  } = useFileUpload(['image/png', 'image/jpeg', 'image/jpg'], 10 * 1024 * 1024);

  const {
    files: presFiles,
    addFiles: addPresFiles,
    removeFile: removePresFile,
    clearFiles: clearPresFiles,
    handleDragOver: handlePresDragOver,
    handleDragLeave: handlePresDragLeave,
    handleDrop: handlePresDrop,
    handleFileSelect: handlePresFileSelect,
    openFileDialog: openPresFileDialog,
    fileInputRef: presFileInputRef,
    errors: presErrors,
  } = useFileUpload(['image/png', 'image/jpeg', 'image/jpg'], 10 * 1024 * 1024);

  const docPreview = useImagePreview(docFiles[0] || null);
  const presPreview = useImagePreview(presFiles[0] || null);

  const handleVerify = () => {
    if (!docFiles[0] || !presFiles[0]) return;
    navigate('/screening', { state: { documentFiles: [docFiles[0]], selfieFiles: [presFiles[0]] } });
  };

  const handleReset = () => {
    clearDocFiles();
    clearPresFiles();
    setSearchParams({});
  };

return (
    <div className="max-w-5xl mx-auto space-y-6">
      <FadeIn>
        <div>
          <h1 className="text-2xl font-bold text-text">Face Verification</h1>
          <p className="text-muted-text">Compare document photo with presented person</p>
        </div>
      </FadeIn>

      <Card padding="md" className="space-y-3">
        <label className="block label">View an existing case
          <select className="input mt-1" value={selectedCase?.id ?? ''} onChange={event => setSearchParams(event.target.value ? { caseId: event.target.value } : {})}>
            <option value="">New document / selfie input</option>
            {cases.filter(record => record.faceResult).map(record => <option key={record.id} value={record.id}>{record.caseNumber} — {record.subjectName}</option>)}
          </select>
        </label>
        <p className="text-sm text-muted-text">Face similarity and liveness are simulated case outcomes. Uploaded photos are passed to the full demo screening flow, not independently scored here.</p>
        {searchParams.get('caseId') && !selectedCase && <p role="alert" className="text-danger">Case not found. Choose an existing case or start a new screening.</p>}
        <Link className="text-primary-accent" to="/screening">Start with a sample pair</Link>
      </Card>
      {selectedCase && <DemoCaseContext record={selectedCase} />}

      {!selectedCase && <FadeIn delay={0.1}>
        <StaggerContainer staggerChildren={0.08}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FadeIn y={16}>
              <Card padding="lg">
                <CardHeader>
                  <CardTitle>Document Face</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <motion.div
                    className={cn(
                      'border-2 border-dashed rounded-xl p-8 text-center transition-colors aspect-square relative',
                      docFiles[0] ? 'border-transparent' : 'border-border hover:border-primary-accent/50'
                    )}
                    onDragOver={handleDocDragOver}
                    onDragLeave={handleDocDragLeave}
                    onDrop={handleDocDrop}
                    onClick={openDocFileDialog}
                    whileHover={docFiles[0] ? undefined : { scale: 1.01 }}
                    whileTap={docFiles[0] ? undefined : { scale: 0.99 }}
                  >
                    <input ref={docFileInputRef} type="file" accept="image/*" onChange={handleDocFileSelect} className="hidden" />
                    {docPreview ? (
                      <img src={docPreview} alt="Document face" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <>
                        <Upload className="w-12 h-12 mx-auto text-muted-text mb-4" />
                        <p className="text-lg font-medium text-text mb-1">Upload document photo</p>
                        <p className="text-sm text-muted-text">PNG, JPG up to 10MB</p>
                      </>
                    )}
                  </motion.div>

                  {docFiles[0] && (
                    <FadeIn y={4}>
                      <div className="flex items-center justify-between p-3 bg-panel-secondary rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-panel rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-muted-text" />
                          </div>
                          <div>
                            <p className="font-medium text-text truncate max-w-[200px]">{docFiles[0].name}</p>
                            <p className="text-xs text-muted-text">{docFiles[0].size > 1024*1024 ? (docFiles[0].size/1024/1024).toFixed(1)+'MB' : (docFiles[0].size/1024).toFixed(0)+'KB'}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => { removeDocFile(0); setDocumentImage(null); }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      </div>
                    </FadeIn>
                  )}

                  {docErrors && Object.keys(docErrors).length > 0 && (
                    <FadeIn y={4}>
                      <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
                        {Object.values(docErrors).join(', ')}
                      </div>
                    </FadeIn>
                  )}
                </CardContent>
              </Card>
            </FadeIn>

            <FadeIn y={16}>
              <Card padding="lg">
                <CardHeader>
                  <CardTitle>Presented Person</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <motion.div
                    className={cn(
                      'border-2 border-dashed rounded-xl p-8 text-center transition-colors aspect-square relative',
                      presFiles[0] ? 'border-transparent' : 'border-border hover:border-primary-accent/50'
                    )}
                    onDragOver={handlePresDragOver}
                    onDragLeave={handlePresDragLeave}
                    onDrop={handlePresDrop}
                    onClick={openPresFileDialog}
                    whileHover={presFiles[0] ? undefined : { scale: 1.01 }}
                    whileTap={presFiles[0] ? undefined : { scale: 0.99 }}
                  >
                    <input ref={presFileInputRef} type="file" accept="image/*" onChange={handlePresFileSelect} className="hidden" />
                    {presPreview ? (
                      <img src={presPreview} alt="Presented person" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <>
                        <Upload className="w-12 h-12 mx-auto text-muted-text mb-4" />
                        <p className="text-lg font-medium text-text mb-1">Upload live capture</p>
                        <p className="text-sm text-muted-text">PNG, JPG up to 10MB</p>
                      </>
                    )}
                  </motion.div>

                  {presFiles[0] && (
                    <FadeIn y={4}>
                      <div className="flex items-center justify-between p-3 bg-panel-secondary rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-panel rounded-lg flex items-center justify-center">
                            <Upload className="w-5 h-5 text-muted-text" />
                          </div>
                          <div>
                            <p className="font-medium text-text truncate max-w-[200px]">{presFiles[0].name}</p>
                            <p className="text-xs text-muted-text">{presFiles[0].size > 1024*1024 ? (presFiles[0].size/1024/1024).toFixed(1)+'MB' : (presFiles[0].size/1024).toFixed(0)+'KB'}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => { removePresFile(0); setPresentedImage(null); }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      </div>
                    </FadeIn>
                  )}

                  {presErrors && Object.keys(presErrors).length > 0 && (
                    <FadeIn y={4}>
                      <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
                        {Object.values(presErrors).join(', ')}
                      </div>
                    </FadeIn>
                  )}
                </CardContent>
              </Card>
            </FadeIn>
          </div>
        </StaggerContainer>
      </FadeIn>}

      <FadeIn delay={0.2}>
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Verification Result</CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <FadeIn>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="text-center">
                      <h4 className="font-medium text-text mb-3">Document Face</h4>
                      <div className="bg-panel-secondary rounded-lg p-4 min-h-[200px] flex items-center justify-center relative mb-3">
                        <DocumentPreview document={selectedCase?.documents[0]} className="w-40 min-h-40 object-contain" />
                        {result.documentFace.boundingBox && (
                          <motion.div
                            className="absolute border-2 border-primary-accent"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                            style={{
                              left: `${result.documentFace.boundingBox.x * 100}%`,
                              top: `${result.documentFace.boundingBox.y * 100}%`,
                              width: `${result.documentFace.boundingBox.width * 100}%`,
                              height: `${result.documentFace.boundingBox.height * 100}%`,
                            }}
                          />
                        )}
                      </div>
                      <div className="flex justify-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-success"><CheckCircle className="w-4 h-4" /> Detected</span>
                        <span className="flex items-center gap-1">Quality: {result.documentFace.qualityScore}%</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center">
                      <AnimatedNumber value={result.similarity} maxValue={100} duration={0.8} className="text-5xl font-bold" style={{ color: result.decision === 'match' ? '#22C55E' : '#EF4444' }} decimals={1} suffix="%" />
                      <Badge variant={result.decision === 'match' ? 'success' : result.decision === 'mismatch' ? 'danger' : 'warning'} size="lg">
                        {result.decision.toUpperCase()}
                      </Badge>
                      <p className="text-sm text-muted-text mt-2">Threshold: {result.threshold}%</p>
                      <Progress value={result.similarity} max={100} size="md" showLabel variant={result.decision === 'match' ? 'success' : result.decision === 'mismatch' ? 'danger' : 'warning'} className="mt-4 w-64" />
                    </div>

                    <div className="text-center">
                      <h4 className="font-medium text-text mb-3">Presented Person</h4>
                      <div className="bg-panel-secondary rounded-lg p-4 min-h-[200px] flex items-center justify-center relative mb-3">
                        <DocumentPreview document={selectedCase?.selfie} className="w-40 min-h-40 object-contain" />
                        {result.presentedFace.boundingBox && (
                          <motion.div
                            className="absolute border-2 border-primary-accent"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                            style={{
                              left: `${result.presentedFace.boundingBox.x * 100}%`,
                              top: `${result.presentedFace.boundingBox.y * 100}%`,
                              width: `${result.presentedFace.boundingBox.width * 100}%`,
                              height: `${result.presentedFace.boundingBox.height * 100}%`,
                            }}
                          />
                        )}
                      </div>
                      <div className="flex justify-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-success"><CheckCircle className="w-4 h-4" /> Detected</span>
                        <span className="flex items-center gap-1">Quality: {result.presentedFace.qualityScore}%</span>
                      </div>
                      <p className="text-sm text-muted-text mt-1">Liveness: {result.presentedFace.livenessStatus.replace('_', ' ')}</p>
                    </div>
                  </div>

                  <StaggerContainer staggerChildren={0.06}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-border">
                      <FadeIn y={8}>
                        <div className="bg-panel-secondary rounded-lg p-4 text-center">
                          <p className="text-2xl font-bold text-text">{result.documentFace.qualityScore}%</p>
                          <p className="text-sm text-muted-text">Doc Face Quality</p>
                        </div>
                      </FadeIn>
                      <FadeIn y={8}>
                        <div className="bg-panel-secondary rounded-lg p-4 text-center">
                          <p className="text-2xl font-bold text-text">{result.presentedFace.qualityScore}%</p>
                          <p className="text-sm text-muted-text">Presented Quality</p>
                        </div>
                      </FadeIn>
                      <FadeIn y={8}>
                        <div className="bg-panel-secondary rounded-lg p-4 text-center">
                          <AnimatedNumber value={result.similarity} maxValue={100} duration={0.6} className="text-2xl font-bold text-text" decimals={1} suffix="%" />
                          <p className="text-sm text-muted-text">Similarity</p>
                        </div>
                      </FadeIn>
                    </div>
                  </StaggerContainer>

                  <FadeIn y={8} delay={0.2}>
                    <div className="mt-4 p-4 bg-primary-accent/10 border border-primary-accent/20 rounded-lg">
                      <p className="text-sm text-primary-accent">
                        <AlertCircle className="w-4 h-4 inline mr-1" />
                        Liveness: {result.presentedFace.livenessStatus.replaceAll('_', ' ')} — simulated. No live-camera liveness check was performed.
                      </p>
                    </div>
                  </FadeIn>
                </div>
              </FadeIn>
            ) : (
              <div className="text-center py-12">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleVerify}
                  disabled={!docFiles[0] || !presFiles[0] || isProcessing}
                  loading={isProcessing}
                  className="w-full max-w-md"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Continue full screening
                </Button>
                <p className="text-sm text-muted-text mt-3">
                  Upload a document photo and selfie to continue, then explicitly select a demo scenario.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {result && (
        <FadeIn delay={0.3} y={8}>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={handleReset} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <RotateCcw className="w-4 h-4 mr-2" />
              New Verification
            </Button>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
