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
      '',
      '0'
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

test('fetchAllVideos returns synchronized data on success', async () => {
  const originalSpreadsheetId = process.env.SPREADSHEET_ID;
  const originalApiKey = process.env.YOUTUBE_API_KEY;
  process.env.SPREADSHEET_ID = 'a'.repeat(44);
  process.env.YOUTUBE_API_KEY = 'test-key';

  const { SHEET_TABS } = await import('../../constants.ts');
  const originalTabs = SHEET_TABS.map(tab => ({ ...tab }));
  SHEET_TABS.length = 1;
  SHEET_TABS[0].range = 'tab!A2:O';

  const calls: string[] = [];
  const localRows = [
    [],
    [
      '',
      'Local',
      'https://www.youtube.com/watch?v=local',
      'Channel',
      '2020-01-01T00:00:00Z',
      'PT10M',
      '0',
      '0',
      '0',
      '',
      '',
      '',
      '',
      '0'
    ]
  ];
  const remoteRows = [
    [
      '',
      'Remote',
      'https://www.youtube.com/watch?v=remote',
      'Channel',
      '2020-01-02T00:00:00Z',
      'PT10M',
      '0',
      '0',
      '0',
      '',
      '',
      '',
      '',
      '0'
    ]
  ];

  const fetchMock = mock.method(globalThis, 'fetch', async (input: any) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.includes('data/videos.json')) {
      calls.push('local');
      return new Response(JSON.stringify(localRows), { status: 200 });
    }
    calls.push('sync');
    return new Response(JSON.stringify({ values: remoteRows }), { status: 200 });
  });

  const { fetchAllVideos } = await import(`./index.ts?success=${Date.now()}`);
  const result = await fetchAllVideos();

  assert.deepEqual(calls, ['local', 'sync', 'sync']);
  assert.equal(result.data?.[0].title, 'Remote');

  mock.restoreAll();
  SHEET_TABS.splice(0, SHEET_TABS.length, ...originalTabs);
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

test('fetchAllVideos keeps local data when synchronization fails', async () => {
  const originalSpreadsheetId = process.env.SPREADSHEET_ID;
  const originalApiKey = process.env.YOUTUBE_API_KEY;
  process.env.SPREADSHEET_ID = 'a'.repeat(44);
  process.env.YOUTUBE_API_KEY = 'test-key';

  const { SHEET_TABS } = await import('../../constants.ts');
  const originalTabs = SHEET_TABS.map(tab => ({ ...tab }));
  SHEET_TABS.length = 1;
  SHEET_TABS[0].range = 'tab!A2:O';

  const calls: string[] = [];
  const localRows = [
    [],
      [
        '',
        'Local',
        'https://www.youtube.com/watch?v=local',
        'Channel',
        '2020-01-01T00:00:00Z',
        'PT10M',
        '0',
        '0',
        '0',
        '',
        '',
        '',
        '',
        '0'
      ]
    ];

  const fetchMock = mock.method(globalThis, 'fetch', async (input: any) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.includes('data/videos.json')) {
      calls.push('local');
      return new Response(JSON.stringify(localRows), { status: 200 });
    }
    calls.push('sync');
    return new Response(JSON.stringify({ values: [] }), { status: 200 });
  });

  const consoleError = mock.method(console, 'error', () => {});

  const { fetchAllVideos } = await import(`./index.ts?failure=${Date.now()}`);
  const result = await fetchAllVideos();

  assert.deepEqual(calls, ['local', 'sync', 'sync']);
  assert.equal(result.data?.[0].title, 'Local');
  assert.ok(result.metadata?.errors?.length);
  assert.ok(consoleError.mock.calls.length >= 1);

  mock.restoreAll();
  SHEET_TABS.splice(0, SHEET_TABS.length, ...originalTabs);
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
