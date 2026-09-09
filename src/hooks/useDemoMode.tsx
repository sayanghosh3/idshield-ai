import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { demoScenarios } from '../services/demoCatalog';

interface DemoModeContextType {
  enabled: boolean;
  activeScenario: string | null;
  setEnabled: (enabled: boolean) => void;
  setActiveScenario: (scenarioId: string | null) => void;
  getScenario: (scenarioId: string) => typeof demoScenarios[0] | undefined;
  scenarios: typeof demoScenarios;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  const setEnabledWithReset = useCallback((value: boolean) => {
    setEnabled(value);
    if (!value) setActiveScenario(null);
  }, []);

  const setActiveScenarioValue = useCallback((scenarioId: string | null) => {
    setActiveScenario(scenarioId);
  }, []);

  const getScenario = useCallback((scenarioId: string) => {
    return demoScenarios.find(s => s.id === scenarioId);
  }, []);

  const actions = useMemo(() => ({
    setEnabled: setEnabledWithReset,
    setActiveScenario: setActiveScenarioValue,
    getScenario,
  }), [setEnabledWithReset, setActiveScenarioValue, getScenario]);

  return (
    <DemoModeContext.Provider value={{ enabled, activeScenario, scenarios: demoScenarios, ...actions }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const context = useContext(DemoModeContext);
  if (!context) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
}
