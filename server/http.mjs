import { createServer } from 'node:http';
import { MAX_BYTES, SecurityError, isId } from './security.mjs';

// Process-local rate limiter. Production needs a shared gateway/distributed store.
export class RateLimiter {
  #buckets = new Map();
  constructor({ limit = 60, windowMs = 60_000, maxClients = 10_000 } = {}) { Object.assign(this, { limit, windowMs, maxClients }); }
  allow(key, now = Date.now()) {
    for (const [id, bucket] of this.#buckets) if (bucket.until <= now) this.#buckets.delete(id);
    let bucket = this.#buckets.get(key);
    if (!bucket) {
      if (this.#buckets.size >= this.maxClients) return false;
      bucket = { count: 0, until: now + this.windowMs };
      this.#buckets.set(key, bucket);
    }
    return ++bucket.count <= this.limit;
  }
}
const headers = {
  'Cache-Control': 'no-store, private',
  'Pragma': 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; sandbox",
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Resource-Policy': 'same-origin',
};
const reject = (status, code) => { throw new SecurityError(status, code); };
async function readBody(request) {
  if (request.headers['content-encoding']) reject(415, 'CONTENT_ENCODING_UNSUPPORTED');
  const declared = request.headers['content-length'];
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_BYTES)) reject(413, 'FILE_TOO_LARGE');
  const chunks = [];
  let size = 0;
  try {
    for await (const chunk of request.iterator({ destroyOnReturn: false })) {
      size += chunk.length;
      if (size > MAX_BYTES) reject(413, 'FILE_TOO_LARGE');
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } finally { for (const chunk of chunks) chunk.fill(0); }
}

// A separate raw-body API, intentionally NOT mounted into the demo upload helper.
// authenticate must validate server-side sessions on EVERY request.
export function createDocumentServer({ service, authenticate, audit, allowedOrigins = [], limiter = new RateLimiter(), requireTls = true }) {
  let active = 0;
  const server = createServer({ maxHeaderSize: 8192 }, async (request, response) => {
    for (const [name, value] of Object.entries(headers)) response.setHeader(name, value);
    response.setHeader('Vary', 'Origin');
    const json = (status, value) => { response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(value)); };
    let principal;
    let counted = false;
    try {
      // Never trust X-Forwarded-Proto from an arbitrary caller. A production TLS
      // terminator needs an explicit trusted-proxy adapter or a native HTTPS server.
      if (requireTls && !request.socket.encrypted) reject(426, 'HTTPS_REQUIRED');
      if (request.socket.encrypted) response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      if (!limiter.allow(request.socket.remoteAddress ?? 'unknown')) reject(429, 'RATE_LIMITED');
      if (active >= 8) reject(503, 'BUSY');
      active++; counted = true;
      const origin = request.headers.origin;
      if (origin) {
        if (!allowedOrigins.includes(origin)) reject(403, 'ORIGIN_DENIED');
        response.setHeader('Access-Control-Allow-Origin', origin);
      }
      if (request.method === 'OPTIONS') {
        response.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS');
        response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
        response.writeHead(204); response.end(); return;
      }
      principal = await authenticate(request.headers.authorization);
      // Exact routes; no query strings (especially credentials or permanent URLs).
      const match = /^\/api\/secure\/cases\/([^/]+)\/documents(?:\/([^/]+))?$/.exec(request.url ?? '');
      if (!match || !isId(match[1]) || (match[2] && !isId(match[2]))) reject(404, 'NOT_FOUND');
      const [, caseId, documentId] = match;
      service.authorize(principal, caseId, request.method === 'DELETE' ? 'delete' : 'read');
      if (request.method === 'POST' && !documentId) {
        let bytes;
        try {
          bytes = await readBody(request);
          return json(201, await service.upload(principal, caseId, bytes, request.headers['content-type']));
        } finally { bytes?.fill(0); }
      }
      if (request.method === 'GET' && documentId) {
        const { bytes, mime } = await service.read(principal, caseId, documentId);
        // Generic filename, no plaintext digest/PII/URL in response headers.
        response.writeHead(200, { 'Content-Type': mime, 'Content-Disposition': 'attachment; filename="document"', 'Content-Length': bytes.length });
        response.end(bytes, () => bytes.fill(0));
        return;
      }
      if (request.method === 'DELETE' && documentId) {
        await service.delete(principal, caseId, documentId);
        response.writeHead(204); response.end(); return;
      }
      reject(405, 'METHOD_NOT_ALLOWED');
    } catch (error) {
      // No request bodies, URLs, tokens, exception messages or stack traces logged.
      try { audit.append({ principal, action: request.method === 'POST' ? 'UPLOAD_REJECTED' : 'ACCESS_DENIED', result: 'denied' }); } catch { /* Do not emit unsafe diagnostics. */ }
      const status = error instanceof SecurityError ? error.status : 503;
      if (status === 429) response.setHeader('Retry-After', '60');
      response.setHeader('Connection', 'close');
      if (!response.headersSent && !response.destroyed) json(status, { error: error instanceof SecurityError ? error.code : 'SERVICE_UNAVAILABLE' });
    } finally { if (counted) active--; }
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  return server;
}
