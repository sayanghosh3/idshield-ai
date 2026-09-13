# Confidential document backend scaffold

This is **DEVELOPMENT ONLY**, with real cryptographic and authorization code.
It is **not a deployed secure document system**. The existing React/Vite frontend
still uses its existing demo/session workflow and is not connected to this API.
Use synthetic documents only. The persistent frontend notice is independent of
the demo toggle or Vite environment flags, so toggling them cannot imply security.

## Architecture and scope

Based on verified main `906aa8667d5e16e2f574692cd8174515a5b6fa52`.
Existing `src/services/api.ts` and `documentService.ts` are frontend API helpers,
not authentication, private storage or authorization boundaries. The separate
`/api/secure` contract avoids silently treating those older helpers as secure.
No existing screening behavior or frontend data model has been redesigned.

`HTTP -> authentication -> case authorization -> bounded raw body -> MIME/magic
validation -> inspection -> malware scan -> SHA-256 -> envelope encryption ->
private storage -> audit hash chain -> ledger adapter`.

No additional packages are required; server code uses Node built-ins. Node 24 is
the verified runtime. Run the usual `npm ci`, `npm run build`, `npm run lint`, and
`npm test`. The security tests are included in the existing test command.

## What is implemented versus missing

| Area | Implemented | Development limit / production work |
| --- | --- | --- |
| Authentication | Server validates hashed bearer sessions and expiry (maximum 15 minutes when configured) | No login, IdP, MFA, refresh flow or durable revocation system. Sessions configured by server operator only. |
| Authorization | Officer/supervisor/admin must have explicit case assignment on every operation. Delete requires supervisor/admin. Recheck after asynchronous validation/decryption. | Replace in-memory assignments with authoritative tenant/case policy. No role-only admin bypass. |
| File validation | 10 MiB body and service limit; exact PNG/JPEG/PDF MIME allowlist and matching signature; no SVG, compression, filenames or multipart | Signatures do not prove a well-formed/safe document. Required parser and scanner adapters are unavailable and **block all uploads by default**. PDF 2.0 is intentionally unsupported. |
| Inspection | Mandatory `inspect(bytes, mime) === true` gate | Wire a sandboxed parser enforcing full structure, dimensions/pages, decompression and CPU/memory limits; reject malformed, active content and ambiguous/polyglot files. No parser is bundled. |
| Malware | Mandatory `scan(bytes, mime) === 'clean'` gate; errors/unknown verdicts fail closed | Connect private malware scanning with timeouts, privacy contracts and signature updates. Do not send confidential documents to public scanning APIs. |
| Encryption | AES-256-GCM, fresh random 256-bit data key per document, independent random 96-bit nonces, GCM-wrapped data keys, authenticated metadata | Local env master key wrapper; replace with KMS/Vault versioned wrap/unwrap, key rotation, access policy and recovery. No browser secrets. |
| Storage | Random server UUID object IDs; encrypted envelopes and metadata only; no static files/public paths/URLs | Memory-only, lost on restart. Implement private durable object storage and metadata repository, quotas, lifecycle rules and database transactions. |
| Access | Authenticated download on every request, expiry/assignment/retention checks, attachment response, no caching | No signed URLs are issued. Paths are resource identifiers, never bearer capabilities. Wire frontend through real auth before use. |
| Integrity | SHA-256 at upload and read, plus GCM authentication bound to document/case/hash/MIME/times | No browser claim of verified integrity. Only a future authenticated API receipt should drive such an indicator. |
| Audit | Append-only service API, explicit field projection, SHA-256 previous-event chain, verification against a trusted count/head checkpoint | Process memory is not immutable storage. A privileged process can rewrite/recompute it. Persist transactionally to WORM/append-only storage and independently anchor checkpoints to detect rewrite/truncation across restarts. |
| Blockchain | Strict adapter schema: only pseudonymous case UUID, document hash, audit hash and timestamp; rejects unknown fields | **SIMULATED** memory ledger, no network, consensus, transaction finality or external proof. Uploads anchor their audit event; subsequent events extend the chain and require external periodic checkpoints in production. |
| Retention | Server-owned 24-hour default; access blocked at expiry; sweep every minute in dev; assigned supervisor/admin delete; envelope removed, deletedAt tombstone retained | In-memory deletion is logical deletion, not guaranteed RAM/disk/backup erasure. Add backup expiry, legal hold/policy governance, key destruction and durable retryable purge jobs. |
| HTTP | Exact routes, bounded headers/bodies/concurrency, timeout settings, restricted CORS, security headers, per-IP rate limiting | Development listener is loopback HTTP. Production requires HTTPS/trusted gateway, shared rate limits, full resource quotas and frontend-host security headers. Scaffold refuses NODE_ENV=production. |

## Development startup and API contract

Use `server/.env.example` as a variable reference. Set server environment securely:
`DOCUMENT_MASTER_KEY_BASE64` is a cryptographically random 32-byte key encoded as
base64; `DOCUMENT_DEV_SESSIONS` contains only token hashes, random actor UUIDs,
roles and expiry times; `DOCUMENT_DEV_ASSIGNMENTS` assigns random case UUIDs to
those actors. Generate tokens using a cryptographic RNG (at least 32 random bytes,
base64url); deliver them out of band and never log them. No credentials, users or
cases are seeded by the repository. No .env loader is bundled.

Run `npm run dev:documents` to listen on **127.0.0.1:8001**. Missing/invalid keys
or session configuration refuse startup. Empty sessions deny every API request.
The listener cannot be enabled in production by setting a flag. Even with valid
sessions, uploads return 503 until real inspection/scanning adapters are supplied
in the composition root. Tests inject exact synthetic-fixture test doubles; never
copy these into an application deployment or add a skip-scan switch.

- `POST /api/secure/cases/:caseId/documents`: `Authorization: Bearer <session>`;
  `Content-Type: image/png`, `image/jpeg` or `application/pdf`; raw bytes, not
  multipart or JSON. No client filename, hash, retention date, actor or role is
  accepted. Returns an opaque document ID, creation/retention dates and explicit
  DEVELOPMENT/SIMULATED status. No document URL or digest in the response.
- `GET /api/secure/cases/:caseId/documents/:documentId`: same authentication;
  validates integrity then returns an attachment with a generic filename. A copied
  path is useless without a currently authorized session. Missing/deleted/expired
  or wrong-case documents share a 404; unassigned cases always return 403 before
  storage lookup; unauthenticated requests always return 401.
- `DELETE /api/secure/cases/:caseId/documents/:documentId`: assigned supervisor or
  admin only, returns 204. No public retention or provisioning endpoint.

No cookies are accepted, so cookie-based CSRF is not introduced here. If the
future frontend uses HttpOnly/Secure/SameSite session cookies, add CSRF tokens and
origin validation before enabling state-changing routes. CORS is not authorization.
The server ignores `X-Forwarded-Proto` and `X-Forwarded-For`; do not disable TLS
checks on a public listener to work around a missing trusted-proxy integration.
The supplied factory defaults to requiring actual TLS and refuses plain HTTP;
its development composition explicitly permits only loopback HTTP.

## Privacy and failure semantics

Raw PII, biometrics, bytes, MRZ, DOB, passport numbers, filenames and document URLs
never enter the server audit or ledger schema. Audit accepts only pseudonymous
actor/case IDs, enumerated role/action/result, sequence, timestamp and hashes.
Denied preauthorization events omit the caller's case ID. HTTP errors use constant
codes and never serialize exception details, URLs, tokens or bodies. Development
startup/retention diagnostics are constant text. The frontend's pre-existing demo
audit data is separate; it must not be exported as the real security audit.

Even hashes and pseudonymous identifiers can be linkable: use a permissioned
ledger with restricted readers, approved retention and an off-chain mapping.
Never add free-text details or actor information to ledger payloads. The adapter
validates shape, not the real-world meaning of arbitrary UUID input; only trusted
server provisioning may create case IDs.

An upload whose audit/ledger step fails removes its encrypted envelope and returns
503. Memory adapters cannot provide a cross-service transaction: production needs
a durable transaction/outbox, idempotency, rollback and reconciliation. Delete
and retention events are recorded after removing the envelope; an audit failure
at that point cannot undo deletion. Production needs atomic records and durable retries. All
scan/parser/KMS/storage calls need adapter-level deadlines. Per-process limits
do not prevent multi-instance abuse. Buffer clearing is best effort in JavaScript,
not a secure-erasure guarantee. No production security certification is claimed.

## Tests
Authorization is rechecked after storage lookups and immediately before returning
plaintext. The storage remove(id, deletedAt, authorize) contract requires calling
the synchronous authorization guard immediately before mutation. The memory
adapter does so without an intervening await. A durable adapter must enforce
equivalent policy inside its deletion transaction; the callback alone cannot
make a remote transaction atomic. Uploads recheck policy after storage writes
and remove the envelope if authorization has expired or been revoked.


`tests/document-security.test.mjs` covers unauthorized/cross-case access, session
expiry and revocation, invalid/oversized/malformed files, fail-closed scanning,
GCM and SHA-256 tampering, audit edits/reorder/truncation, ledger PII rejection,
retention/deletion, ledger failure rollback, CORS, headers, TLS spoofing, rate
limits and the production startup refusal. Successful-upload tests use synthetic
bytes and test-only scanner/inspector adapters; they do not prove malware safety.
