import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

test('la copie publique utilise une adresse stable et un cache revalidé', async () => {
  const urls: string[] = [];
  mock.method(globalThis, 'fetch', async (input: any, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.url;
    urls.push(url);
    assert.equal(url, 'data/videos.json');
    assert.equal(init?.cache, 'no-cache');
    return new Response(JSON.stringify(validRows), { status: 200 });
  });
  try {
    const { fetchLocalVideos } = await import('./local.ts');
    const first = await fetchLocalVideos();
    const second = await fetchLocalVideos();
    assert.equal(first.error, undefined);
    assert.equal(second.error, undefined);
    assert.deepEqual(first.data, second.data);
    assert.deepEqual(urls, ['data/videos.json', 'data/videos.json']);
  } finally { mock.restoreAll(); }
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

test('la provenance partielle reste distincte de la disponibilité de la copie', async () => {
  const metadata = { status: 'degraded', source: 'mixed', videoCount: 1, lastSuccessfulSync: '2026-10-10T12:00:00Z' };
  mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ schemaVersion: 1, metadata, videos: validRows })));
  try {
    const { fetchLocalVideos } = await import('./local.ts');
    const result = await fetchLocalVideos();
    assert.equal(result.error, undefined);
    assert.equal(result.data.length, 1);
    assert.deepEqual(result.metadata?.sync, metadata);
    assert.equal(result.metadata?.warnings, undefined);
  } finally { mock.restoreAll(); }
});

test('des métadonnées invalides ne prouvent pas une synchronisation complète', async () => {
  mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ videos: validRows, metadata: { status: 'complete', source: 'youtube', videoCount: 1, lastSuccessfulSync: 'invalid' } })));
  try {
    const { fetchLocalVideos } = await import('./local.ts');
    const result = await fetchLocalVideos();
    assert.equal(result.error, undefined);
    assert.equal(result.metadata?.sync, undefined);
  } finally { mock.restoreAll(); }
});
