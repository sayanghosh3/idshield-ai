import { Component, Suspense } from 'react';
import type { ReactNode } from 'react';
class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <section role="alert" className="card space-y-3">
      <h1 className="text-xl font-semibold">This screen could not load</h1>
      <p className="text-muted-text">Use the navigation to reopen it. If the connection was interrupted, restore it and try again.</p>
    </section>;
    return this.props.children;
  }
}
export function RouteContent({ children }: { children: ReactNode }) {
  return <RouteErrorBoundary><Suspense fallback={<div role="status" aria-live="polite" className="card space-y-4">
    <p>Loading screen…</p><div className="h-6 w-1/3 bg-panel-secondary rounded animate-pulse" />
    <div className="h-40 bg-panel-secondary rounded animate-pulse" />
  </div>}>{children}</Suspense></RouteErrorBoundary>;
}
