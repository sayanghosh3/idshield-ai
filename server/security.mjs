import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

export const MAX_BYTES = 10 * 1024 * 1024;
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const hashPattern = /^[0-9a-f]{64}$/;
export const isId = value => typeof value === 'string' && uuidPattern.test(value);
export class SecurityError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}
const fail = (status, code) => { throw new SecurityError(status, code); };

// This is only the inexpensive first gate. A sandboxed parser AND scanner must
// approve the complete file before encryption/storage. Signatures alone are unsafe.
export function validateFile(bytes, mime) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) fail(400, 'EMPTY_FILE');
  if (bytes.length > MAX_BYTES) fail(413, 'FILE_TOO_LARGE');
  const png = bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  const jpeg = bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'));
  const pdf = /^%PDF-1\.[0-7][\r\n]/.test(bytes.subarray(0, 9).toString('ascii'));
  if (!((mime === 'image/png' && png) || (mime === 'image/jpeg' && jpeg) || (mime === 'application/pdf' && pdf))) {
    fail(415, 'UNSUPPORTED_FILE');
  }
}

export const unavailableInspection = Object.freeze({
  async inspect() { fail(503, 'DOCUMENT_INSPECTION_UNAVAILABLE'); },
});
export const unavailableScanner = Object.freeze({
  async scan() { fail(503, 'MALWARE_SCAN_UNAVAILABLE'); },
});

function seal(key, bytes, context) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(context));
  return { iv: iv.toString('base64'), data: Buffer.concat([cipher.update(bytes), cipher.final()]).toString('base64'), tag: cipher.getAuthTag().toString('base64') };
}
function unseal(key, envelope, context) {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(envelope.data, 'base64')), decipher.final()]);
}

// Local development key wrapper. Replace wrap/unwrap with KMS/Vault calls.
// Only the server reads this key; NEVER use a VITE_ variable for secrets.
export class EnvKeyManager {
  #key;
  constructor(base64Key) {
    if (typeof base64Key !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(base64Key)) fail(503, 'KEY_NOT_CONFIGURED');
    this.#key = Buffer.from(base64Key, 'base64');
    if (this.#key.length !== 32) fail(503, 'KEY_NOT_CONFIGURED');
  }
  async wrap(key, context) { return { keyId: 'env-development-v1', ...seal(this.#key, key, context) }; }
  async unwrap(wrapped, context) {
    if (wrapped.keyId !== 'env-development-v1') fail(503, 'KEY_UNAVAILABLE');
    return unseal(this.#key, wrapped, context);
  }
}

export class EncryptionService {
  constructor(keyManager) { this.keyManager = keyManager; }
  async encrypt(bytes, context) {
    const key = randomBytes(32);
    try { return { version: 1, wrappedKey: await this.keyManager.wrap(key, context), ciphertext: seal(key, bytes, context) }; }
    finally { key.fill(0); }
  }
  async decrypt(envelope, context) {
    let key;
    try {
      if (envelope.version !== 1) fail(409, 'INTEGRITY_FAILED');
      key = await this.keyManager.unwrap(envelope.wrappedKey, context);
      return unseal(key, envelope.ciphertext, context);
    } catch { fail(409, 'INTEGRITY_FAILED'); }
    finally { key?.fill(0); }
  }
}

// No static directory, object URL or raw document bytes. Ephemeral, process-only.
// Production adapter needs private storage, atomic metadata writes and durable deletion.
export class MemoryPrivateStorage {
  #records = new Map();
  async put(record) { this.#records.set(record.id, structuredClone(record)); }
  async get(id) { return structuredClone(this.#records.get(id)); }
  async remove(id, deletedAt, authorize = () => {}) {
    // The guard and mutation are synchronous here. Durable adapters must enforce
    // the equivalent policy check inside their deletion transaction.
    authorize();
    const record = this.#records.get(id);
    if (record) this.#records.set(id, { ...record, envelope: undefined, deletedAt });
  }
  async expired(now) {
    return [...this.#records.values()].filter(r => !r.deletedAt && Date.parse(r.retentionUntil) <= now).map(r => r.id);
  }
}

// Case IDs and principal IDs are randomly generated UUIDs provisioned on the server.
// Roles alone NEVER grant access to an unassigned case, including admins.
export class AuthorizationService {
  constructor(assignments = new Map()) { this.assignments = assignments; }
  authorize(principal, caseId, action) {
    if (!principal || !isId(principal.id) || !['officer', 'supervisor', 'admin'].includes(principal.role) || !Number.isFinite(principal.expiresAt) || principal.expiresAt <= Date.now()) fail(401, 'UNAUTHENTICATED');
    if (!isId(caseId) || !this.assignments.get(caseId)?.has(principal.id)) fail(403, 'ACCESS_DENIED');
    if (action === 'delete' && !['supervisor', 'admin'].includes(principal.role)) fail(403, 'ACCESS_DENIED');
  }
}

// Development bearer sessions: high entropy token hashes from server configuration.
// No cookies or URL tokens. Replace authenticate with verified IdP sessions + MFA.
export class DevelopmentAuthenticator {
  constructor(sessions = []) {
    for (const s of sessions) {
      if (!hashPattern.test(s.tokenHash) || !isId(s.id) || !['officer', 'supervisor', 'admin'].includes(s.role)
        || !Number.isFinite(s.expiresAt) || s.expiresAt <= Date.now() || s.expiresAt > Date.now() + 15 * 60_000) fail(503, 'INVALID_SESSION_CONFIG');
    }
    this.sessions = structuredClone(sessions);
  }
  authenticate(header) {
    if (typeof header !== 'string' || !/^Bearer [A-Za-z0-9_-]{43,128}$/.test(header)) fail(401, 'UNAUTHENTICATED');
    const digest = Buffer.from(sha256(header.slice(7)), 'hex');
    const session = this.sessions.find(s => timingSafeEqual(digest, Buffer.from(s.tokenHash, 'hex')));
    if (!session || session.expiresAt <= Date.now()) fail(401, 'UNAUTHENTICATED');
    return { id: session.id, role: session.role, expiresAt: session.expiresAt };
  }
}

const ledgerKeys = ['caseId', 'documentHash', 'auditHash', 'timestamp'];
export function validateLedgerPayload(payload) {
  if (!payload || Object.keys(payload).length !== ledgerKeys.length || !ledgerKeys.every(k => Object.hasOwn(payload, k))
    || !isId(payload.caseId) || typeof payload.documentHash !== 'string' || !hashPattern.test(payload.documentHash)
    || typeof payload.auditHash !== 'string' || !hashPattern.test(payload.auditHash)
    || typeof payload.timestamp !== 'string' || !Number.isFinite(Date.parse(payload.timestamp))
    || new Date(payload.timestamp).toISOString() !== payload.timestamp) fail(400, 'INVALID_LEDGER_PAYLOAD');
  return Object.freeze({ caseId: payload.caseId, documentHash: payload.documentHash, auditHash: payload.auditHash, timestamp: payload.timestamp });
}

export class BlockchainAnchorService {
  constructor(adapter) { this.adapter = adapter; }
  async anchor(payload) { return this.adapter.anchor(validateLedgerPayload(payload)); }
}
export class DevelopmentLedgerAdapter {
  #proofs = [];
  async anchor(payload) { this.#proofs.push(validateLedgerPayload(payload)); return { mode: 'SIMULATED' }; }
  snapshot() { return structuredClone(this.#proofs); }
}

const actions = ['DOCUMENT_UPLOADED', 'DOCUMENT_VIEWED', 'DOCUMENT_DELETED', 'RETENTION_DELETED', 'ACCESS_DENIED', 'UPLOAD_REJECTED', 'INTEGRITY_FAILED'];
const zeroHash = '0'.repeat(64);
function auditBody(e) {
  return { sequence: e.sequence, actorId: e.actorId, role: e.role, caseId: e.caseId, action: e.action, result: e.result, timestamp: e.timestamp, previousHash: e.previousHash };
}
export class AuditLedgerService {
  #events = [];
  append({ principal, caseId = null, action, result }) {
    // Explicit projection: no caller-provided details, names, filenames or error text.
    if (!actions.includes(action) || !['allowed', 'denied', 'failed'].includes(result) || (caseId !== null && !isId(caseId))) fail(500, 'INVALID_AUDIT_EVENT');
    const actorId = isId(principal?.id) ? principal.id : null;
    const role = ['officer', 'supervisor', 'admin', 'system'].includes(principal?.role) ? principal.role : 'anonymous';
    const body = auditBody({ sequence: this.#events.length + 1, actorId, role, caseId, action, result, timestamp: new Date().toISOString(), previousHash: this.#events.at(-1)?.eventHash ?? zeroHash });
    const event = Object.freeze({ ...body, eventHash: sha256(JSON.stringify(body)) });
    this.#events.push(event);
    return event;
  }
  snapshot() { return structuredClone(this.#events); }
  checkpoint() { return { count: this.#events.length, head: this.#events.at(-1)?.eventHash ?? zeroHash }; }
  static verify(events, checkpoint) {
    try {
      let previousHash = zeroHash;
      for (const [index, event] of events.entries()) {
        if (Object.keys(event).length !== 9 || event.sequence !== index + 1 || event.previousHash !== previousHash || sha256(JSON.stringify(auditBody(event))) !== event.eventHash) return false;
        previousHash = event.eventHash;
      }
      return !!checkpoint && checkpoint.count === events.length && checkpoint.head === previousHash;
    } catch { return false; }
  }
}

function encryptionContext(r) {
  // Bind metadata to ciphertext so moving an envelope between cases or extending
  // retention in the storage adapter cannot silently pass GCM verification.
  return JSON.stringify([r.id, r.caseId, r.mime, r.hash, r.createdAt, r.retentionUntil]);
}
export class SecureDocumentService {
  constructor({ storage, encryption, authorization, audit, blockchain, inspector = unavailableInspection, scanner = unavailableScanner, retentionMs = 24 * 60 * 60_000 }) {
    if (!Number.isSafeInteger(retentionMs) || retentionMs <= 0 || retentionMs > 30 * 24 * 60 * 60_000) fail(503, 'INVALID_RETENTION');
    Object.assign(this, { storage, encryption, authorization, audit, blockchain, inspector, scanner, retentionMs });
  }
  authorize(principal, caseId, action) {
    try { this.authorization.authorize(principal, caseId, action); }
    catch (error) { this.audit.append({ principal, action: 'ACCESS_DENIED', result: 'denied' }); throw error; }
  }
  async upload(principal, caseId, bytes, mime) {
    this.authorize(principal, caseId, 'upload');
    // Copy before awaiting third-party adapters to prevent caller mutation races.
    validateFile(bytes, mime);
    const document = Buffer.from(bytes);
    try {
      if (await this.inspector.inspect(Buffer.from(document), mime) !== true) fail(422, 'MALFORMED_DOCUMENT');
      if (await this.scanner.scan(Buffer.from(document), mime) !== 'clean') fail(422, 'UNSAFE_DOCUMENT');
      this.authorize(principal, caseId, 'upload');
      const now = Date.now();
      const record = { id: randomUUID(), caseId, mime, hash: sha256(document), createdAt: new Date(now).toISOString(), retentionUntil: new Date(now + this.retentionMs).toISOString(), deletedAt: null };
      record.envelope = await this.encryption.encrypt(document, encryptionContext(record));
      this.authorize(principal, caseId, 'upload');
      await this.storage.put(record);
      try {
        this.authorize(principal, caseId, 'upload');
        const event = this.audit.append({ principal, caseId, action: 'DOCUMENT_UPLOADED', result: 'allowed' });
        await this.blockchain.anchor({ caseId, documentHash: record.hash, auditHash: event.eventHash, timestamp: event.timestamp });
      } catch {
        await this.storage.remove(record.id, new Date().toISOString());
        fail(503, 'AUDIT_OR_LEDGER_UNAVAILABLE');
      }
      return { id: record.id, createdAt: record.createdAt, retentionUntil: record.retentionUntil, encrypted: true, integrity: 'verified', infrastructure: 'DEVELOPMENT', ledger: 'SIMULATED' };
    } catch (error) {
      this.audit.append({ principal, caseId, action: 'UPLOAD_REJECTED', result: 'failed' });
      throw error;
    } finally { document.fill(0); }
  }
  async record(principal, caseId, id, action) {
    this.authorize(principal, caseId, action);
    if (!isId(id)) fail(404, 'DOCUMENT_UNAVAILABLE');
    const record = await this.storage.get(id);
    this.authorize(principal, caseId, action);
    if (!record || record.caseId !== caseId || record.deletedAt || Date.parse(record.retentionUntil) <= Date.now()) fail(404, 'DOCUMENT_UNAVAILABLE');
    return record;
  }
  async read(principal, caseId, id) {
    const record = await this.record(principal, caseId, id, 'read');
    let bytes;
    try {
      bytes = await this.encryption.decrypt(record.envelope, encryptionContext(record));
      if (sha256(bytes) !== record.hash) fail(409, 'INTEGRITY_FAILED');
    } catch {
      bytes?.fill(0);
      this.audit.append({ principal, caseId, action: 'INTEGRITY_FAILED', result: 'failed' });
      fail(409, 'INTEGRITY_FAILED');
    }
    try {
      // Recheck session, assignment, deletion and expiry after asynchronous I/O.
      await this.record(principal, caseId, id, 'read');
      this.authorize(principal, caseId, 'read');
      this.audit.append({ principal, caseId, action: 'DOCUMENT_VIEWED', result: 'allowed' });
      return { bytes, mime: record.mime };
    } catch (error) { bytes.fill(0); throw error; }
  }
  async delete(principal, caseId, id) {
    await this.record(principal, caseId, id, 'delete');
    await this.storage.remove(id, new Date().toISOString(), () => this.authorize(principal, caseId, 'delete'));
    this.audit.append({ principal, caseId, action: 'DOCUMENT_DELETED', result: 'allowed' });
  }
  async sweepRetention(now = Date.now()) {
    let deleted = 0;
    for (const id of await this.storage.expired(now)) {
      const record = await this.storage.get(id);
      await this.storage.remove(id, new Date(now).toISOString());
      this.audit.append({ principal: { role: 'system' }, caseId: record.caseId, action: 'RETENTION_DELETED', result: 'allowed' });
      deleted++;
    }
    return deleted;
  }
}
