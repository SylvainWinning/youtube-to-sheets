import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchAllVideos } from './videos.ts';

test('browser reader fetches only the published JSON even with private Google configuration', async (t) => {
  const previous = { id: process.env.SPREADSHEET_ID, key: process.env.YOUTUBE_API_KEY };
  process.env.SPREADSHEET_ID = 'a'.repeat(44);
  process.env.YOUTUBE_API_KEY = 'test-private-key';
  t.after(() => {
    if (previous.id === undefined) delete process.env.SPREADSHEET_ID; else process.env.SPREADSHEET_ID = previous.id;
    if (previous.key === undefined) delete process.env.YOUTUBE_API_KEY; else process.env.YOUTUBE_API_KEY = previous.key;
  });
  const urls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    urls.push(url);
    return new Response(JSON.stringify([[], ['', 'Published video', 'https://youtu.be/abcdefghijk', 'Public channel', '2020-01-01T00:00:00Z', 'PT2M', '10', '0', '0', '', '', '', '']]), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
  const result = await fetchAllVideos();
  assert.equal(urls.length, 1);
  assert.match(urls[0], /^data\/videos\.json\?t=\d+$/);
  assert.equal(result.metadata?.source, 'local');
  assert.equal(result.data?.[0].title, 'Published video');
});
