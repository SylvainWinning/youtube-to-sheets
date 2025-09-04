import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

// Verify that fetchLocalVideos disables caching and adds a unique version parameter
// to the request URL.
test('fetchLocalVideos ajoute un paramètre de version et utilise cache "no-store"', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', async (input: any, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.url;
    assert.ok(/data\/videos\.json\?t=\d+/.test(url));
    assert.equal(init?.cache, 'no-store');
    return new Response(JSON.stringify([[]]), { status: 200 });
  });

  const { fetchLocalVideos } = await import(`./local.ts?test=${Date.now()}`);

  await fetchLocalVideos();
  assert.equal(fetchMock.mock.calls.length, 1);

  mock.restoreAll();
});
