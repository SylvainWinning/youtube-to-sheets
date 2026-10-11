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

const validRows = [[], ['', 'Local', 'https://youtu.be/local', 'Channel', '2020-01-01T00:00:00Z', 'PT10M', '0', '0', '0', '', '', '', '']];

test('une réponse HTTP en erreur est rejetée même avec un corps rempli', async () => {
  mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(validRows), { status: 503 }));
  try {
    const { fetchLocalVideos } = await import('./local.ts');
    const result = await fetchLocalVideos();
    assert.deepEqual(result.data, []);
    assert.match(result.error ?? '', /503/);
  } finally { mock.restoreAll(); }
});
test('les copies invalides ou sans vidéo ne servent pas de secours', async () => {
  const { fetchLocalVideos } = await import('./local.ts');
  for (const content of [{ error: 'bad' }, [], [[]], [[], ['invalid']]]) {
    mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(content)));
    try {
      const result = await fetchLocalVideos();
      assert.equal(result.data.length, 0);
      assert.ok(result.error);
    } finally { mock.restoreAll(); }
  }
});
test('la date de publication vient du serveur et reste inconnue si absente ou invalide', async () => {
  const { fetchLocalVideos } = await import('./local.ts');
  for (const value of ['Sat, 10 Oct 2026 22:00:00 GMT', '', 'invalid']) {
    mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(validRows), { headers: { 'Last-Modified': value } }));
    try {
      const result = await fetchLocalVideos();
      assert.equal(result.error, undefined);
      assert.equal(result.metadata?.source, 'local');
      assert.equal(result.metadata?.publishedAt, value.startsWith('Sat') ? Date.parse(value) : undefined);
      assert.ok(result.metadata?.timestamp);
    } finally { mock.restoreAll(); }
  }
});
