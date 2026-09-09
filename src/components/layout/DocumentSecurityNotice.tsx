export function DocumentSecurityNotice() {
  return (
    <aside aria-label="Document privacy status" className="mb-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
      <p className="font-semibold text-warning">Document privacy: DEMO / SIMULATED</p>
      <p className="text-muted-text">Use sample documents only. This interface is not connected to authenticated encrypted storage. Restricted access, integrity verification and blockchain audit proofs are unavailable here.</p>
    </aside>
  );
}
