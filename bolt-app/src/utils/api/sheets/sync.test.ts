import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

test("getConfig propose une aide si l'ID est absent", async () => {
  const originalSpreadsheetId = process.env.SPREADSHEET_ID;
  delete process.env.SPREADSHEET_ID;

  const { getConfig } = await import(`../../constants.ts?sync=${Date.now()}`);
  const config = getConfig();

  assert.equal(config.SPREADSHEET_ID, '');
  assert.ok(config.help);
  assert.ok(!('error' in config));

  if (originalSpreadsheetId === undefined) {
    delete process.env.SPREADSHEET_ID;
  } else {
    process.env.SPREADSHEET_ID = originalSpreadsheetId;
  }
});

// Ensure the sheet synchronization can handle more than 1000 rows
// by mocking the global fetch to return 1201 unique entries.
test('synchronizeSheets handles large sheet ranges', async () => {
  const rows = Array.from({ length: 1201 }, (_, i) => [
    'https://example.com/avatar.jpg',
    `Title ${i}`,
    `https://www.youtube.com/watch?v=${i}`,
    'Channel',
    '2020-01-01T00:00:00Z',
    'PT10M',
    '100',
    '10',
    '1',
    'Description',
    'tag',
    'Category',
    'https://example.com/thumb.jpg'
  ]);

  const originalSpreadsheetId = process.env.SPREADSHEET_ID;
  const originalApiKey = process.env.YOUTUBE_API_KEY;
  process.env.SPREADSHEET_ID = 'test-id';
  process.env.YOUTUBE_API_KEY = 'test-key';

  const { synchronizeSheets } = await import('./sync.ts');
  const { SHEET_TABS } = await import('../../constants.ts');
  const originalTabs = SHEET_TABS.map(tab => ({ ...tab }));

  try {
    // Limit to a single tab to simplify the mock
    SHEET_TABS.length = 1;
    SHEET_TABS[0].range = 'tab!A2:M';

    mock.method(globalThis, 'fetch', async () => {
      return new Response(JSON.stringify({ values: rows }), { status: 200 });
    });

    const videos = await synchronizeSheets();
    assert.equal(videos.length, 1201);
  } finally {
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
  }
});

test('synchronizeSheets aligne les variantes d’URL sur l’ordre maître', async () => {
  const originalSpreadsheetId = process.env.SPREADSHEET_ID;
  const originalApiKey = process.env.YOUTUBE_API_KEY;
  process.env.SPREADSHEET_ID = 'a'.repeat(44);
  process.env.YOUTUBE_API_KEY = 'test-key';

  const { synchronizeSheets } = await import('./sync.ts');
  const { SHEET_TABS } = await import('../../constants.ts');
  const originalTabs = SHEET_TABS.map(tab => ({ ...tab }));

  const masterValues = [
    ['Avatar', 'Titre', 'Lien'],
    ['Avatar 1', 'Titre 1', 'https://youtu.be/ID_ONE?si=test'],
    ['Avatar 2', 'Titre 2', 'https://www.youtube.com/watch?v=ID_TWO&list=abc'],
  ];

  const tabRows = [
    [
      'https://example.com/avatar1.jpg',
      'Tab 1',
      'https://www.youtube.com/watch?v=ID_ONE&list=xyz',
      'Chaine 1',
      '2024-01-01T00:00:00Z',
      'PT5M',
      '100',
      '10',
      '1',
      'Description 1',
      'tag',
      'Catégorie',
      'https://example.com/thumb1.jpg',
    ],
    [
      'https://example.com/avatar2.jpg',
      'Tab 2',
      'https://youtu.be/ID_TWO',
      'Chaine 2',
      '2024-01-02T00:00:00Z',
      'PT10M',
      '200',
      '20',
      '2',
      'Description 2',
      'tag',
      'Catégorie',
      'https://example.com/thumb2.jpg',
    ],
  ];

  try {
    SHEET_TABS.length = 1;
    SHEET_TABS[0].range = "'tab'!A2:M";

    mock.method(globalThis, 'fetch', async (input: any) => {
      const url = typeof input === 'string' ? input : input.url;
      if (
        url.includes("values/%27AllVideos%27!A%3AZ") ||
        url.includes("values/'AllVideos'!A%3AZ")
      ) {
        return new Response(JSON.stringify({ values: masterValues }), { status: 200 });
      }
      if (
        url.includes('values/%27tab%27!A2%3AM') ||
        url.includes("values/'tab'!A2%3AM")
      ) {
        return new Response(JSON.stringify({ values: tabRows }), { status: 200 });
      }
      throw new Error(`URL inattendue: ${url}`);
    });

    const videos = await synchronizeSheets();
    const titles = videos.map(video => video.title);
    assert.deepEqual(titles, ['Tab 1', 'Tab 2']);
  } finally {
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
  }
});
