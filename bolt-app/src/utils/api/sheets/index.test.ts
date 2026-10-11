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
  assert.equal(result.error, undefined);
  assert.ok(result.metadata?.warnings?.includes(error));

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
  SHEET_TABS[0].range = 'tab!A2:M';

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
      ''
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
      ''
    ]
  ];

  mock.method(globalThis, 'fetch', async (input: any) => {
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
  assert.equal(result.metadata?.source, 'sheets');
  assert.equal(result.metadata?.warnings, undefined);

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
  SHEET_TABS[0].range = 'tab!A2:M';

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
      ''
    ]
  ];

  mock.method(globalThis, 'fetch', async (input: any) => {
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
  assert.equal(result.error, undefined);
  assert.equal(result.metadata?.source, 'local');
  assert.ok(result.metadata?.warnings?.length);
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

test('le budget global coupe les reprises parallèles et conserve la copie locale', async t => {
  const oldId = process.env.SPREADSHEET_ID; const oldKey = process.env.YOUTUBE_API_KEY;
  process.env.SPREADSHEET_ID = 'a'.repeat(44); process.env.YOUTUBE_API_KEY = 'qa-only';
  t.after(() => {
    if (oldId === undefined) delete process.env.SPREADSHEET_ID; else process.env.SPREADSHEET_ID = oldId;
    if (oldKey === undefined) delete process.env.YOUTUBE_API_KEY; else process.env.YOUTUBE_API_KEY = oldKey;
  });
  const { LOAD_MAX_ATTEMPTS } = await import('../../requestPolicy.ts');
  const { fetchAllVideos } = await import('./index.ts');
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (input: string) => {
    calls++;
    if (input.includes('data/videos.json')) return new Response(JSON.stringify([[], ['', 'Local', 'https://youtu.be/local', 'Channel', '2020-01-01', 'PT10M', '0', '0', '0', '', '', '', '']]));
    return new Response('', { status: 429, headers: { 'Retry-After': '0' } });
  });
  t.mock.method(console, 'error', () => {}); t.mock.method(console, 'warn', () => {});
  const result = await fetchAllVideos();
  assert.equal(result.data[0].title, 'Local');
  assert.equal(result.error, undefined);
  assert.ok(result.metadata?.warnings?.length);
  assert.ok(calls <= LOAD_MAX_ATTEMPTS && calls > 4);
  assert.ok(result.metadata?.warnings?.some(message => message.includes('Budget de requêtes')));
});

test('la durée globale couvre la synchronisation entière, pas seulement chaque requête', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const oldId = process.env.SPREADSHEET_ID; const oldKey = process.env.YOUTUBE_API_KEY;
  process.env.SPREADSHEET_ID = 'a'.repeat(44); process.env.YOUTUBE_API_KEY = 'qa-only';
  t.after(() => {
    if (oldId === undefined) delete process.env.SPREADSHEET_ID; else process.env.SPREADSHEET_ID = oldId;
    if (oldKey === undefined) delete process.env.YOUTUBE_API_KEY; else process.env.YOUTUBE_API_KEY = oldKey;
  });
  const signals: AbortSignal[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string, init: RequestInit) => {
    if (input.includes('data/videos.json')) return new Response(JSON.stringify([[], ['', 'Local', 'https://youtu.be/local', 'Channel', '2020-01-01', 'PT10M', '0', '0', '0', '', '', '', '']]));
    signals.push(init.signal as AbortSignal); return new Promise(() => {});
  });
  t.mock.method(console, 'error', () => {}); t.mock.method(console, 'warn', () => {});
  const { fetchAllVideos } = await import('./index.ts');
  const result = fetchAllVideos();
  const flush = async () => { for (let i = 0; i < 80; i++) await Promise.resolve(); };
  await flush(); t.mock.timers.tick(15000); await flush(); t.mock.timers.tick(5000); await flush();
  const response = await result;
  assert.equal(response.data[0].title, 'Local'); assert.ok(response.metadata?.warnings?.length);
  assert.ok(signals.length > 0 && signals.every(signal => signal.aborted));
});
