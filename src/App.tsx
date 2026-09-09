import { lazy } from 'react';
import { MotionConfig } from 'motion/react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout';
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const NewScreening = lazy(() => import('./pages/NewScreening').then(module => ({ default: module.NewScreening })));
const ScreeningResult = lazy(() => import('./pages/ScreeningResult').then(module => ({ default: module.ScreeningResult })));
const Cases = lazy(() => import('./pages/Cases').then(module => ({ default: module.Cases })));
const CaseDetails = lazy(() => import('./pages/CaseDetails').then(module => ({ default: module.CaseDetails })));
const Documents = lazy(() => import('./pages/Documents').then(module => ({ default: module.Documents })));
const FaceVerification = lazy(() => import('./pages/FaceVerification').then(module => ({ default: module.FaceVerification })));
const Reports = lazy(() => import('./pages/Reports').then(module => ({ default: module.Reports })));
const AuditLog = lazy(() => import('./pages/AuditLog').then(module => ({ default: module.AuditLog })));
const Settings = lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));
const RiskCases = lazy(() => import('./pages/RiskCases').then(module => ({ default: module.RiskCases })));
import { ScreeningProvider } from './hooks/useScreening';
import { DemoModeProvider } from './hooks/useDemoMode';

function App() {
  return (
    <MotionConfig reducedMotion="user"><BrowserRouter>
      <ScreeningProvider>
        <DemoModeProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="screening" element={<NewScreening />} />
              <Route path="screening/result/:caseId" element={<ScreeningResult />} />
              <Route path="cases" element={<Cases />} />
              <Route path="cases/:caseId" element={<CaseDetails />} />
              <Route path="risk-cases" element={<RiskCases />} />
              <Route path="documents" element={<Documents />} />
              <Route path="face" element={<FaceVerification />} />
              <Route path="reports" element={<Reports />} />
              <Route path="audit" element={<AuditLog />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </DemoModeProvider>
      </ScreeningProvider>
    </BrowserRouter></MotionConfig>
  );
}

export default App;
