import { AuditLedgerService, AuthorizationService, BlockchainAnchorService, DevelopmentAuthenticator, DevelopmentLedgerAdapter, EncryptionService, EnvKeyManager, MemoryPrivateStorage, SecureDocumentService, isId } from './security.mjs';
import { createDocumentServer } from './http.mjs';

// No production switch can turn these ephemeral adapters into production services.
// No .env loader: supply server environment through your secret manager/process.
try {
  if (process.env.NODE_ENV === 'production') throw new Error();
  const sessions = JSON.parse(process.env.DOCUMENT_DEV_SESSIONS ?? '[]');
  const assignments = JSON.parse(process.env.DOCUMENT_DEV_ASSIGNMENTS ?? '{}');
  if (!Array.isArray(sessions) || !assignments || Array.isArray(assignments) || typeof assignments !== 'object') throw new Error();
  for (const [caseId, users] of Object.entries(assignments)) {
    if (!isId(caseId) || !Array.isArray(users) || !users.every(isId)) throw new Error();
  }
  const auth = new DevelopmentAuthenticator(sessions);
  const audit = new AuditLedgerService();
  const service = new SecureDocumentService({
    storage: new MemoryPrivateStorage(),
    encryption: new EncryptionService(new EnvKeyManager(process.env.DOCUMENT_MASTER_KEY_BASE64)),
    authorization: new AuthorizationService(new Map(Object.entries(assignments).map(([id, users]) => [id, new Set(users)]))),
    audit,
    blockchain: new BlockchainAnchorService(new DevelopmentLedgerAdapter()),
    // Inspection and malware scanning are deliberately unavailable: fail closed.
  });
  const server = createDocumentServer({ service, audit, authenticate: header => auth.authenticate(header), allowedOrigins: ['http://localhost:5173'], requireTls: false });
  const timer = setInterval(() => { service.sweepRetention().catch(() => { process.stderr.write('Retention service failed.\n'); }); }, 60_000);
  timer.unref();
  server.on('close', () => clearInterval(timer));
  server.on('error', () => { process.stderr.write('Document development server failed.\n'); process.exitCode = 1; clearInterval(timer); });
  server.listen(8001, '127.0.0.1', () => {
    process.stdout.write('Document scaffold: DEVELOPMENT ONLY, loopback port 8001. Uploads blocked pending inspection/scanning. Ledger SIMULATED.\n');
  });
} catch {
  process.stderr.write('Document server refused startup: development configuration/keys required; production adapters unavailable.\n');
  process.exitCode = 1;
}
