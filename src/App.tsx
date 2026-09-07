import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout';
import {
  Dashboard,
  NewScreening,
  ScreeningResult,
  Cases,
  CaseDetails,
  Documents,
  FaceVerification,
  Reports,
  AuditLog,
  Settings,
  RiskCases,
} from './pages';
import { ScreeningProvider } from './hooks/useScreening';
import { DemoModeProvider } from './hooks/useDemoMode';

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;