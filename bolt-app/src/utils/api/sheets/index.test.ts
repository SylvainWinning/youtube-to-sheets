import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

test('fetchAllVideos uses local data when config error', async () => {
  const originalSpreadsheetId = process.env.SPREADSHEET_ID;
  const originalApiKey = process.env.YOUTUBE_API_KEY;
  process.env.SPREADSHEET_ID = 'test-id';
  delete process.env.YOUTUBE_API_KEY;

  const { fetchAllVideos } = await import(`./index.ts?index=${Date.now()}`);
  const { getConfig } = await import(`../../constants.ts?index=${Date.now()}`);

  const { error } = getConfig();
  assert.ok(error, 'Test requires missing configuration');

  const rows = [
    [],
    [
      '',
      'Video 1',
      'https://www.youtube.com/watch?v=1',
      'Channel',
      '2020-01-01T00:00:00Z',
      'PT10M',
      '0',
      '0',
      '0',
      '',
      '',
      '',
      ''
    ]
  ];

  const fetchMock = mock.method(globalThis, 'fetch', async () => {
    return new Response(JSON.stringify(rows), { status: 200 });
  });

  const result = await fetchAllVideos();

  assert.equal(fetchMock.mock.calls.length, 1);
  assert.equal(result.error, error);
  assert.ok(result.metadata?.errors?.includes(error));

  mock.restoreAll();
  if (originalSpreadsheetId === undefined) {
    delete process.env.SPREADSHEET_ID;
  } else {
    process.env.SPREADSHEET_ID = originalSpreadsheetId;
  }
  if (originalApiKey === undefined) {
    delete process.env.YOUTUBE_API_KEY;
  } else {
    process.env.YOUTUBE_API_KEY = originalApiKey;
  }
});
