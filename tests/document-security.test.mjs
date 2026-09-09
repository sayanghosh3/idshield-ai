import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { AuditLedgerService, AuthorizationService, BlockchainAnchorService, DevelopmentAuthenticator, DevelopmentLedgerAdapter, EncryptionService, EnvKeyManager, MAX_BYTES, MemoryPrivateStorage, SecureDocumentService, sha256, unavailableInspection, unavailableScanner, validateFile } from '../server/security.mjs';
import { createDocumentServer, RateLimiter } from '../server/http.mjs';

// Synthetic 1x1 PNG only. These exact-fixture adapters are TEST DOUBLES, not
// parsers or malware scanners, and are never imported by the development server.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==', 'base64');
const inspector = { async inspect(bytes) { return bytes.equals(png); } };
const scanner = { async scan() { return 'clean'; } };
function fixture(overrides = {}) {
  const caseId = randomUUID();
  const otherCase = randomUUID();
  const officer = { id: randomUUID(), role: 'officer', expiresAt: Date.now() + 60_000 };
  const stranger = { id: randomUUID(), role: 'officer', expiresAt: Date.now() + 60_000 };
  const supervisor = { id: randomUUID(), role: 'supervisor', expiresAt: Date.now() + 60_000 };
  const assignments = new Map([[caseId, new Set([officer.id, supervisor.id])], [otherCase, new Set([stranger.id])]]);
  const storage = new MemoryPrivateStorage();
  const encryption = new EncryptionService(new EnvKeyManager(randomBytes(32).toString('base64')));
  const audit = new AuditLedgerService();
  const ledger = new DevelopmentLedgerAdapter();
  const blockchain = new BlockchainAnchorService(ledger);
  const service = new SecureDocumentService({ storage, encryption, authorization: new AuthorizationService(assignments), audit, blockchain, inspector, scanner, ...overrides });
  return { caseId, otherCase, officer, stranger, supervisor, assignments, storage, encryption, audit, ledger, blockchain, service };
}
const expectCode = code => error => error.code === code;
const upload = f => f.service.upload(f.officer, f.caseId, png, 'image/png');

test('server-side upload encrypts private records with unique wrapped data keys', async () => {
  const f = fixture();
  const a = await upload(f); const b = await upload(f);
  const ar = await f.storage.get(a.id); const br = await f.storage.get(b.id);
  assert.notEqual(a.id, b.id);
  assert.notDeepEqual(ar.envelope.wrappedKey, br.envelope.wrappedKey);
  assert.notDeepEqual(ar.envelope.ciphertext, br.envelope.ciphertext);
  assert.equal(JSON.stringify(ar).includes(png.toString('base64')), false);
  assert.equal(ar.hash, sha256(png));
  assert.deepEqual((await f.service.read(f.officer, f.caseId, a.id)).bytes, png);
  assert.equal(a.ledger, 'SIMULATED');
  assert.equal(a.uploadUrl, undefined);
});

test('unauthenticated, expired, other-officer and unassigned-admin access denied', async () => {
  const f = fixture(); const { id } = await upload(f);
  for (const principal of [null, { ...f.officer, expiresAt: 0 }, { ...f.officer, expiresAt: undefined }]) {
    await assert.rejects(f.service.read(principal, f.caseId, id), expectCode('UNAUTHENTICATED'));
  }
  for (const principal of [f.stranger, { ...f.stranger, role: 'admin' }]) {
    await assert.rejects(f.service.read(principal, f.caseId, id), expectCode('ACCESS_DENIED'));
    await assert.rejects(f.service.read(principal, f.caseId, randomUUID()), expectCode('ACCESS_DENIED'));
    await assert.rejects(f.service.upload(principal, f.caseId, png, 'image/png'), expectCode('ACCESS_DENIED'));
  }
  await assert.rejects(f.service.read(f.stranger, f.otherCase, id), expectCode('DOCUMENT_UNAVAILABLE'));
});

test('revoked case assignment is rechecked after document decryption', async () => {
  const f = fixture(); const { id } = await upload(f);
  const original = f.encryption.decrypt.bind(f.encryption);
  f.encryption.decrypt = async (...args) => { const result = await original(...args); f.assignments.get(f.caseId).delete(f.officer.id); return result; };
  await assert.rejects(f.service.read(f.officer, f.caseId, id), expectCode('ACCESS_DENIED'));
});

test('size, MIME and magic bytes must agree; reject empty, SVG, disguised and malformed documents', async () => {
  assert.throws(() => validateFile(Buffer.alloc(0), 'image/png'), expectCode('EMPTY_FILE'));
  assert.throws(() => validateFile(Buffer.alloc(MAX_BYTES + 1), 'image/png'), expectCode('FILE_TOO_LARGE'));
  for (const [bytes, mime] of [[png, 'image/jpeg'], [png, 'image/png; charset=utf-8'], [Buffer.from('<svg/>'), 'image/svg+xml'], [Buffer.from('MZ executable'), 'application/pdf']]) {
    assert.throws(() => validateFile(bytes, mime), expectCode('UNSUPPORTED_FILE'));
  }
  const f = fixture();
  await assert.rejects(f.service.upload(f.officer, f.caseId, png.subarray(0, 8), 'image/png'), expectCode('MALFORMED_DOCUMENT'));
  assert.equal(f.ledger.snapshot().length, 0);
});

test('inspection and malware integration fail closed on unavailable, failure and unsafe verdicts', async () => {
  for (const overrides of [{ inspector: unavailableInspection }, { scanner: unavailableScanner }, { scanner: { async scan() { return 'infected'; } } }, { scanner: { async scan() { return undefined; } } }]) {
    const f = fixture(overrides);
    await assert.rejects(upload(f));
    assert.equal(f.ledger.snapshot().length, 0);
  }
});

test('GCM rejects ciphertext tampering and metadata substitution', async () => {
  for (const mutate of [
    r => { r.envelope.ciphertext.data = Buffer.alloc(png.length).toString('base64'); },
    r => { r.hash = sha256('different'); },
    r => { r.retentionUntil = new Date(Date.now() + 600_000).toISOString(); },
    r => { r.envelope.wrappedKey.tag = randomBytes(16).toString('base64'); },
  ]) {
    const f = fixture(); const { id } = await upload(f);
    const record = await f.storage.get(id); mutate(record); await f.storage.put(record);
    await assert.rejects(f.service.read(f.officer, f.caseId, id), expectCode('INTEGRITY_FAILED'));
    assert.equal(f.audit.snapshot().at(-1).action, 'INTEGRITY_FAILED');
  }
});

test('SHA-256 check independently detects altered plaintext from a faulty decrypt adapter', async () => {
  const f = fixture(); const { id } = await upload(f);
  const altered = Buffer.from(png); altered[20] ^= 1;
  assert.notEqual(sha256(altered), sha256(png));
  f.encryption.decrypt = async () => Buffer.from(altered);
  await assert.rejects(f.service.read(f.officer, f.caseId, id), expectCode('INTEGRITY_FAILED'));
});

test('audit chain detects edits, reorder, deletion and truncation against a trusted checkpoint', async () => {
  const f = fixture(); await upload(f); await upload(f);
  const events = f.audit.snapshot(); const checkpoint = f.audit.checkpoint();
  assert.equal(AuditLedgerService.verify(events, checkpoint), true);
  const edited = structuredClone(events); edited[0].action = 'DOCUMENT_VIEWED';
  assert.equal(AuditLedgerService.verify(edited, checkpoint), false);
  assert.equal(AuditLedgerService.verify([...events].reverse(), checkpoint), false);
  assert.equal(AuditLedgerService.verify(events.slice(1), checkpoint), false);
  assert.equal(AuditLedgerService.verify(events.slice(0, -1), checkpoint), false);
  assert.equal(AuditLedgerService.verify(events, null), false);
  assert.equal(AuditLedgerService.verify(f.audit.snapshot(), checkpoint), true);
});

test('audit excludes arbitrary PII and ledger rejects any extra payload fields', async () => {
  const f = fixture(); const pii = { name: 'SYNTHETIC PERSON', passportNumber: 'TEST-PASSPORT', mrz: 'TEST-MRZ', dob: 'TEST-DOB', biometrics: 'TEST-FACE', bytes: png.toString('base64'), url: 'https://invalid.test/private' };
  f.audit.append({ principal: { ...f.officer, ...pii }, caseId: f.caseId, action: 'DOCUMENT_VIEWED', result: 'allowed', ...pii });
  await upload(f);
  const payload = f.ledger.snapshot()[0];
  assert.deepEqual(Object.keys(payload).sort(), ['auditHash', 'caseId', 'documentHash', 'timestamp']);
  for (const [key, value] of Object.entries(pii)) {
    assert.equal(JSON.stringify(f.audit.snapshot()).includes(value), false);
    await assert.rejects(f.blockchain.anchor({ ...payload, [key]: value }), expectCode('INVALID_LEDGER_PAYLOAD'));
  }
  await assert.rejects(f.blockchain.anchor({ ...payload, caseId: pii.passportNumber }), expectCode('INVALID_LEDGER_PAYLOAD'));
  await assert.rejects(f.blockchain.anchor({ ...payload, documentHash: pii.mrz }), expectCode('INVALID_LEDGER_PAYLOAD'));
});

test('delete requires assigned supervisor/admin; deleted and expired records cannot be read', async () => {
  const f = fixture(); const a = await upload(f); const b = await upload(f);
  await assert.rejects(f.service.delete(f.officer, f.caseId, a.id), expectCode('ACCESS_DENIED'));
  await f.service.delete(f.supervisor, f.caseId, a.id);
  assert.equal((await f.storage.get(a.id)).envelope, undefined);
  await assert.rejects(f.service.read(f.officer, f.caseId, a.id), expectCode('DOCUMENT_UNAVAILABLE'));
  assert.equal(await f.service.sweepRetention(Date.parse(b.retentionUntil) + 1), 1);
  assert.equal((await f.storage.get(b.id)).envelope, undefined);
  assert.equal(await f.service.sweepRetention(Date.parse(b.retentionUntil) + 1), 0);
  await assert.rejects(f.service.read(f.officer, f.caseId, b.id), expectCode('DOCUMENT_UNAVAILABLE'));
});

test('expired retention denies reads before scheduled cleanup', async () => {
  const f = fixture(); const { id } = await upload(f);
  const record = await f.storage.get(id); record.retentionUntil = new Date(0).toISOString(); await f.storage.put(record);
  await assert.rejects(f.service.read(f.officer, f.caseId, id), expectCode('DOCUMENT_UNAVAILABLE'));
});

test('ledger failures roll back document availability', async () => {
  const f = fixture({ blockchain: { async anchor() { throw new Error('unavailable'); } } });
  let stored;
  const put = f.storage.put.bind(f.storage);
  f.storage.put = async record => { stored = record.id; return put(record); };
  await assert.rejects(upload(f), expectCode('AUDIT_OR_LEDGER_UNAVAILABLE'));
  assert.equal((await f.storage.get(stored)).envelope, undefined);
});

test('development authentication rejects invalid/expired sessions and server refuses production', () => {
  assert.throws(() => new EnvKeyManager(''), expectCode('KEY_NOT_CONFIGURED'));
  const token = randomBytes(32).toString('base64url');
  const session = { tokenHash: sha256(token), id: randomUUID(), role: 'officer', expiresAt: Date.now() + 60_000 };
  const auth = new DevelopmentAuthenticator([session]);
  assert.equal(auth.authenticate(`Bearer ${token}`).id, session.id);
  for (const value of [undefined, token, `Bearer ${randomBytes(32).toString('base64url')}`]) assert.throws(() => auth.authenticate(value), expectCode('UNAUTHENTICATED'));
  auth.sessions[0].expiresAt = 0;
  assert.throws(() => auth.authenticate(`Bearer ${token}`), expectCode('UNAUTHENTICATED'));
  assert.throws(() => new DevelopmentAuthenticator([{ ...session, expiresAt: Date.now() + 3_600_000 }]), expectCode('INVALID_SESSION_CONFIG'));
  const result = spawnSync(process.execPath, ['server/start.mjs'], { env: { ...process.env, NODE_ENV: 'production' }, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /refused startup/);
});

async function httpFixture(t, options = {}) {
  const f = fixture();
  const token = randomBytes(32).toString('base64url');
  const auth = new DevelopmentAuthenticator([{ ...f.officer, tokenHash: sha256(token) }]);
  const server = createDocumentServer({ service: f.service, audit: f.audit, authenticate: header => auth.authenticate(header), allowedOrigins: ['http://localhost:5173'], requireTls: false, ...options });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return { ...f, auth, base: `http://127.0.0.1:${server.address().port}`, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/png' } };
}

test('HTTP auth, upload, authenticated download, expiry, headers and restricted CORS', async t => {
  const f = await httpFixture(t);
  const url = `${f.base}/api/secure/cases/${f.caseId}/documents`;
  assert.equal((await fetch(url, { method: 'POST', body: png })).status, 401);
  assert.equal((await fetch(url, { method: 'POST', headers: { ...f.headers, Origin: 'https://evil.test' }, body: png })).status, 403);
  const created = await fetch(url, { method: 'POST', headers: f.headers, body: png });
  assert.equal(created.status, 201); const { id } = await created.json();
  assert.equal((await fetch(`${url}/${id}`)).status, 401);
  const read = await fetch(`${url}/${id}`, { headers: f.headers });
  assert.equal(read.status, 200); assert.deepEqual(Buffer.from(await read.arrayBuffer()), png);
  assert.equal(read.headers.get('cache-control'), 'no-store, private');
  assert.equal(read.headers.get('x-content-type-options'), 'nosniff');
  assert.match(read.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal(read.headers.get('referrer-policy'), 'no-referrer');
  assert.equal((await fetch(`${url}/${id}?token=secret`, { headers: f.headers })).status, 404);
  f.auth.sessions[0].expiresAt = 0;
  assert.equal((await fetch(`${url}/${id}`, { headers: f.headers })).status, 401);
});

test('HTTP rejects signature mismatch, malformed content and compressed uploads', async t => {
  const f = await httpFixture(t); const url = `${f.base}/api/secure/cases/${f.caseId}/documents`;
  assert.equal((await fetch(url, { method: 'POST', headers: f.headers, body: 'not a PNG' })).status, 415);
  assert.equal((await fetch(url, { method: 'POST', headers: f.headers, body: png.subarray(0, 8) })).status, 422);
  assert.equal((await fetch(url, { method: 'POST', headers: { ...f.headers, 'Content-Encoding': 'gzip' }, body: png })).status, 415);
  async function oversizedDenied(body, duplex) {
    try { assert.equal((await fetch(url, { method: 'POST', headers: f.headers, body, duplex })).status, 413); }
    catch (error) {
      // Early refusal closes the socket while an abusive client is still writing;
      // Windows may surface that as ECONNRESET instead of delivering the 413.
      assert.equal(error.cause?.code, 'ECONNRESET');
    }
    assert.equal(f.ledger.snapshot().length, 0);
    assert.equal(f.audit.snapshot().at(-1).action, 'UPLOAD_REJECTED');
  }
  await oversizedDenied(Buffer.alloc(MAX_BYTES + 1));
  async function* oversizedChunks() { for (let i = 0; i < 11; i++) yield Buffer.alloc(1024 * 1024); }
  await oversizedDenied(oversizedChunks(), 'half');
});

test('HTTP requires actual TLS and refuses forwarded-proto spoofing', async t => {
  const f = await httpFixture(t, { requireTls: true });
  assert.equal((await fetch(f.base, { headers: { 'X-Forwarded-Proto': 'https' } })).status, 426);
});

test('rate limiting is enforced with bounded client state', async t => {
  const limiter = new RateLimiter({ limit: 1, maxClients: 1 });
  assert.equal(limiter.allow('one', 0), true); assert.equal(limiter.allow('one', 1), false);
  assert.equal(limiter.allow('two', 1), false); assert.equal(limiter.allow('two', 60_001), true);
  const f = await httpFixture(t, { limiter: new RateLimiter({ limit: 1 }) });
  await fetch(f.base);
  const response = await fetch(f.base); assert.equal(response.status, 429); assert.equal(response.headers.get('retry-after'), '60');
});
