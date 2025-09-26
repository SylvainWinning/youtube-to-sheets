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

test('synchronizeSheets respecte la colonne playlistPosition du master', async () => {
  const masterValues = [
    [
      'channelAvatar', 'title', 'link', 'channel', 'publishedAt', 'duration',
      'views', 'likes', 'comments', 'shortDescription', 'tags', 'category',
      'thumbnail', 'myCategory', 'playlistPosition'
    ],
    [
      'https://example.com/avatar-b.jpg',
      'Titre B',
      'https://www.youtube.com/watch?v=video-b',
      'Chaine',
      '2024-01-01T00:00:00Z',
      'PT5M',
      '0',
      '0',
      '0',
      'Desc',
      'tag',
      'Catégorie',
      'https://example.com/thumb-b.jpg',
      '',
      '5'
    ],
    [
      'https://example.com/avatar-a.jpg',
      'Titre A',
      'https://www.youtube.com/watch?v=video-a',
      'Chaine',
      '2024-01-01T00:00:00Z',
      'PT5M',
      '0',
      '0',
      '0',
      'Desc',
      'tag',
      'Catégorie',
      'https://example.com/thumb-a.jpg',
      '',
      '1'
    ],
    [
      'https://example.com/avatar-c.jpg',
      'Titre C',
      'https://www.youtube.com/watch?v=video-c',
      'Chaine',
      '2024-01-01T00:00:00Z',
      'PT5M',
      '0',
      '0',
      '0',
      'Desc',
      'tag',
      'Catégorie',
      'https://example.com/thumb-c.jpg',
      '',
      '3'
    ],
  ];

  const tabValues = [
    [
      'https://example.com/avatar-a.jpg',
      'Titre A',
      'https://www.youtube.com/watch?v=video-a',
      'Chaine',
      '2024-01-01T00:00:00Z',
      '00:05',
      '10',
      '5',
      '1',
      'Desc',
      'tag',
      'Catégorie',
      'https://example.com/thumb-a.jpg'
    ],
    [
      'https://example.com/avatar-b.jpg',
      'Titre B',
      'https://www.youtube.com/watch?v=video-b',
      'Chaine',
      '2024-01-01T00:00:00Z',
      '00:05',
      '10',
      '5',
      '1',
      'Desc',
      'tag',
      'Catégorie',
      'https://example.com/thumb-b.jpg'
    ],
    [
      'https://example.com/avatar-c.jpg',
      'Titre C',
      'https://www.youtube.com/watch?v=video-c',
      'Chaine',
      '2024-01-01T00:00:00Z',
      '00:05',
      '10',
      '5',
      '1',
      'Desc',
      'tag',
      'Catégorie',
      'https://example.com/thumb-c.jpg'
    ]
  ];

  const originalSpreadsheetId = process.env.SPREADSHEET_ID;
  const originalApiKey = process.env.YOUTUBE_API_KEY;
  process.env.SPREADSHEET_ID = 'test-id';
  process.env.YOUTUBE_API_KEY = 'test-key';

  const { synchronizeSheets } = await import('./sync.ts');
  const { SHEET_TABS } = await import('../../constants.ts');
  const originalTabs = SHEET_TABS.map(tab => ({ ...tab }));

  try {
    SHEET_TABS.length = 1;
    SHEET_TABS[0] = {
      name: 'Test',
      range: "'TestTab'!A:Z",
      durationRange: { min: 0, max: 10 }
    };

    mock.method(globalThis, 'fetch', async (input: any) => {
      const url = typeof input === 'string' ? input : input?.url ?? String(input);

      if (url.includes("'AllVideos'!A%3AZ")) {
        return new Response(JSON.stringify({ values: masterValues }), { status: 200 });
      }

      if (url.includes("'TestTab'!A%3AZ")) {
        return new Response(JSON.stringify({ values: tabValues }), { status: 200 });
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    const videos = await synchronizeSheets();

    assert.deepEqual(
      videos.map(video => video.link),
      [
        'https://www.youtube.com/watch?v=video-a',
        'https://www.youtube.com/watch?v=video-c',
        'https://www.youtube.com/watch?v=video-b'
      ]
    );

    assert.deepEqual(
      videos.map(video => video.playlistPosition),
      [1, 3, 5]
    );
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
