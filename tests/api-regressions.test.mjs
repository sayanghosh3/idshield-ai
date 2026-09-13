import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function moduleUrl(source) {
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return 'data:text/javascript;base64,' + Buffer.from(output).toString('base64');
}
const apiSource = readFileSync(new URL('../src/services/api.ts', import.meta.url), 'utf8');
const apiUrl = moduleUrl(apiSource);
const api = await import(apiUrl);

test('API keeps Headers and tuple headers, assigns correct body types, and accepts 204', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => { calls.push({ url, ...options }); return new Response(null, { status: 204 }); });
  const response = await api.apiRequest('/api/documents/one', { method: 'DELETE', headers: new Headers({ Authorization: 'Bearer synthetic' }) });
  assert.equal(response.success, true);
  assert.equal(response.data, undefined);
  assert.equal(calls[0].headers.get('authorization'), 'Bearer synthetic');
  assert.equal(calls[0].headers.has('content-type'), false);
  await api.apiRequest('/api/documents', { method: 'POST', body: new File(['sample'], 'sample.png', { type: 'image/png' }), headers: [['Authorization', 'Bearer synthetic']] });
  assert.equal(calls[1].headers.get('content-type'), 'image/png');
  assert.equal(calls[1].headers.get('authorization'), 'Bearer synthetic');
  await api.apiRequest('/api/test', { method: 'POST', body: '{}' });
  assert.equal(calls[2].headers.get('content-type'), 'application/json');
  await api.apiRequest('/api/test', { method: 'POST', body: new FormData() });
  assert.equal(calls[3].headers.has('content-type'), false);
});

test('downloads use relative URL by default, return blobs and reject error bodies', async t => {
  let requested;
  t.mock.method(globalThis, 'fetch', async url => { requested = url; return new Response('file', { status: 200 }); });
  assert.equal(await (await api.apiDownload('/api/reports/example/download')).text(), 'file');
  assert.equal(requested, '/api/reports/example/download');
  globalThis.fetch = async () => new Response('not found', { status: 404 });
  await assert.rejects(api.apiDownload('/api/reports/missing/download'), error => error.status === 404);
  globalThis.fetch = async () => Response.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  await assert.rejects(api.apiDownload('/api/reports/private/download'), error => error.status === 401 && error.code === 'UNAUTHENTICATED');
});

test('configured base URL has one path separator', async () => {
  const configured = await import(moduleUrl(apiSource.replace('import.meta.env?.VITE_API_BASE_URL', JSON.stringify('https://example.invalid/'))));
  assert.equal(configured.apiUrl('/api/cases'), 'https://example.invalid/api/cases');
});

test('default demo report generates real case JSON', async () => {
  let source = readFileSync(new URL('../src/services/reportService.ts', import.meta.url), 'utf8');
  source = source.replace('import.meta.env.VITE_APP_ENV', "'development'")
    .replace("'./caseRepository'", JSON.stringify(new URL('../src/services/caseRepository.ts', import.meta.url).href))
    .replace("'../utils/screeningStatus'", JSON.stringify(new URL('../src/utils/screeningStatus.ts', import.meta.url).href))
    .replace("'./api'", JSON.stringify(apiUrl));
  const { reportService } = await import(moduleUrl(source));
  const result = await reportService.generateReport('case-2');
  assert.equal(result.format, 'json');
  assert.equal(JSON.parse(result.content).caseId, 'case-2');
});
