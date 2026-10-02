import { useEffect, useSyncExternalStore } from 'react';
import { apiUrl } from '../services/api';

interface ModuleHealth { status: string; detail: string }
interface Health { status: string; modules: Record<string, ModuleHealth> }
let snapshot: Health = { status: 'CHECKING', modules: {} };
const listeners = new Set<() => void>();
let pending = false;
let lastCheck = 0;

export async function refreshBackendHealth() {
  if (pending || Date.now() - lastCheck < 30000) return;
  pending = true;
  try {
    const response = await fetch(apiUrl('/health'), { signal: AbortSignal.timeout(5000) });
    const data = await response.json() as Health;
    if (!response.ok || !data.modules || !['ONLINE', 'PARTIALLY AVAILABLE'].includes(data.status)) throw new Error('Invalid health response');
    snapshot = data;
  } catch {
    snapshot = { status: 'OFFLINE', modules: {} };
  } finally {
    pending = false;
    lastCheck = Date.now();
    listeners.forEach(listener => listener());
  }
}

export function useBackendHealth() {
  const health = useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => snapshot);
  useEffect(() => {
    void refreshBackendHealth();
    const timer = setInterval(() => { if (!document.hidden) void refreshBackendHealth(); }, 60000);
    return () => clearInterval(timer);
  }, []);
  return health;
}
