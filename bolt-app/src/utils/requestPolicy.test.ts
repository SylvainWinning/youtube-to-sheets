import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchJsonWithRetry, parseRetryAfter, REQUEST_POLICY, createAbortScope, runAbortable } from './requestPolicy.ts';
const url = 'https://example.test/videos';
const errorOf = (promise: Promise<unknown>): Promise<Error> => promise.then(() => { throw new Error('Expected rejection'); }, error => error as Error);
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };

test('un 429 permanent ne dépasse jamais quatre tentatives', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response('', { status: 429, headers: { 'Retry-After': '0' } }); });
  await assert.rejects(fetchJsonWithRetry(url), /HTTP 429/);
  assert.equal(calls, REQUEST_POLICY.maxAttempts);
});

test('la quatrième tentative peut réussir, sans cinquième requête', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => ++calls < 4
    ? new Response('', { status: 429, headers: { 'Retry-After': '0' } })
    : new Response(JSON.stringify({ ok: true })));
  assert.deepEqual(await fetchJsonWithRetry(url), { ok: true });
  assert.equal(calls, 4);
});

test('Retry-After valide les secondes et dates HTTP, et rejette les valeurs mal formées', () => {
  const now = Date.parse('Sun, 11 Oct 2026 00:00:00 GMT');
  assert.equal(parseRetryAfter(' 2 ', now), 2000);
  assert.equal(parseRetryAfter('0', now), 0);
  assert.equal(parseRetryAfter('Sun, 11 Oct 2026 00:00:03 GMT', now), 3000);
  assert.equal(parseRetryAfter('Sat, 10 Oct 2026 00:00:00 GMT', now), 0);
  assert.equal(parseRetryAfter('Sunday, 11-Oct-26 00:00:03 GMT', now), 3000);
  assert.equal(parseRetryAfter('Sun Oct 11 00:00:03 2026', now), 3000);
  for (const value of [null, '', '-1', '1.5', 'NaN', '10garbage', '2026-10-11', 'Mon 10', 'Sun, 31 Feb 2026 00:00:00 GMT']) assert.equal(parseRetryAfter(value, now), null);
  assert.equal(parseRetryAfter('9'.repeat(100), now), Infinity);
});

test('un délai serveur dépassant le budget arrête immédiatement, sans le raccourcir', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response('', { status: 429, headers: { 'Retry-After': '60' } }); });
  await assert.rejects(fetchJsonWithRetry(url), { name: 'TimeoutError' });
  assert.equal(calls, 1);
});

test('un en-tête invalide emploie le recul exponentiel borné', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response('', { status: 429, headers: { 'Retry-After': '-5' } }); });
  const result = errorOf(fetchJsonWithRetry(url));
  await flush(); assert.equal(calls, 1);
  for (const delay of [1000, 2000, 4000]) {
    t.mock.timers.tick(delay - 1); await flush();
    const before: number = calls; t.mock.timers.tick(1); await flush(); assert.equal(calls, before + 1);
  }
  assert.match((await result).message, /HTTP 429/);
  assert.equal(calls, 4);
});

test('une annulation pendant Retry-After interdit toute tentative suivante', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0; const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response('', { status: 429, headers: { 'Retry-After': '1' } }); });
  const result = errorOf(fetchJsonWithRetry(url, { signal: controller.signal }));
  await flush(); controller.abort(); await flush();
  assert.equal((await result).name, 'AbortError');
  t.mock.timers.tick(30000); await flush(); assert.equal(calls, 1);
});

test('une requête déjà annulée ne part pas sur le réseau', async t => {
  const controller = new AbortController(); controller.abort();
  const fetch = t.mock.method(globalThis, 'fetch');
  await assert.rejects(fetchJsonWithRetry(url, { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(fetch.mock.calls.length, 0);
});

test('un transport bloqué est annulé à chaque délai, avec une reprise bornée', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const signals: AbortSignal[] = [];
  t.mock.method(globalThis, 'fetch', (_url: string, init: RequestInit) => { signals.push(init.signal as AbortSignal); return new Promise(() => {}); });
  const result = errorOf(fetchJsonWithRetry(url, { policy: { ...REQUEST_POLICY, maxAttempts: 2, totalTimeoutMs: 30000 } }));
  await flush(); t.mock.timers.tick(5000); await flush(); assert.equal(signals[0].aborted, true);
  t.mock.timers.tick(1000); await flush(); assert.equal(signals.length, 2);
  t.mock.timers.tick(5000); await flush(); assert.equal(signals[1].aborted, true);
  assert.equal((await result).name, 'TimeoutError');
});

test('le budget total interrompt même une tentative qui ignore AbortSignal', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0; let signal: AbortSignal | undefined;
  t.mock.method(globalThis, 'fetch', (_url: string, init: RequestInit) => { calls++; signal = init.signal as AbortSignal; return new Promise(() => {}); });
  const result = errorOf(fetchJsonWithRetry(url, { policy: { ...REQUEST_POLICY, attemptTimeoutMs: 30000, totalTimeoutMs: 12000 } }));
  await flush(); t.mock.timers.tick(12000); await flush();
  assert.equal((await result).name, 'TimeoutError'); assert.equal(calls, 1); assert.equal(signal?.aborted, true);
});

test('une réponse JSON tardive est ignorée après expiration, même si le transport ignore l’annulation', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let finish!: (value: unknown) => void;
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: () => new Promise(resolve => { finish = resolve; }) }));
  const result = errorOf(fetchJsonWithRetry(url, { policy: { ...REQUEST_POLICY, maxAttempts: 1 } }));
  await flush(); t.mock.timers.tick(5000); await flush(); const error = await result;
  assert.equal(error.name, 'TimeoutError'); finish({ stale: true }); await flush(); assert.equal(await result, error);
});

test('les erreurs HTTP permanentes ne sont pas reprises', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return new Response('', { status: 403 }); });
  await assert.rejects(fetchJsonWithRetry(url), /HTTP 403/); assert.equal(calls, 1);
});

test('une réussite libère le timer global et n’est pas annulée après coup', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let signal!: AbortSignal;
  t.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => { signal = init.signal as AbortSignal; return new Response('{}'); });
  await fetchJsonWithRetry(url); t.mock.timers.tick(30000); assert.equal(signal.aborted, false);
});

test('la portée d’annulation relaye le parent et le wrapper rejette une réponse tardive', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const parent = new AbortController(); const scope = createAbortScope(parent.signal, 20000);
  let finish!: (value: string) => void;
  const result = errorOf(runAbortable(() => new Promise<string>(resolve => { finish = resolve; }), scope.signal));
  await flush(); parent.abort(); const error = await result; assert.equal(error.name, 'AbortError');
  finish('late'); await flush(); assert.equal(await result, error); scope.dispose();
});
