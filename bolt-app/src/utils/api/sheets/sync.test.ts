import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { parsePlaylistPosition, buildMasterOrderMap } from './sync.ts';

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

const HEADER_ROW = [
  'channelAvatar',
  'title',
  'link',
  'channel',
  'publishedAt',
  'duration',
  'views',
  'likes',
  'comments',
  'shortDescription',
  'tags',
  'category',
  'thumbnail',
  'myCategory',
  'playlistPosition'
];

test('parsePlaylistPosition gère les nombres et les chaînes valides', () => {
  assert.equal(parsePlaylistPosition(5), 5);
  assert.equal(parsePlaylistPosition('7'), 7);
  assert.equal(parsePlaylistPosition(' 12 '), 12);
  assert.equal(parsePlaylistPosition('7.0'), 7);
});

test('parsePlaylistPosition renvoie null pour les valeurs invalides', () => {
  assert.equal(parsePlaylistPosition(''), null);
  assert.equal(parsePlaylistPosition('abc'), null);
  assert.equal(parsePlaylistPosition(null), null);
  assert.equal(parsePlaylistPosition(undefined), null);
  assert.equal(parsePlaylistPosition(Number.NaN), null);
});

test('buildMasterOrderMap privilégie la colonne playlistPosition lorsque disponible', () => {
  const values = [
    HEADER_ROW,
    ['', '', 'https://youtu.be/a1', '', '', '', '', '', '', '', '', '', '', '', '3'],
    ['', '', 'https://youtu.be/b2', '', '', '', '', '', '', '', '', '', '', '', '1'],
    ['', '', 'https://youtu.be/c3', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', 'https://youtu.be/b2', '', '', '', '', '', '', '', '', '', '', '', '42'],
  ];

  const { orderMap, explicitCount } = buildMasterOrderMap(values);

  assert.equal(orderMap['https://youtu.be/a1'], 3);
  assert.equal(orderMap['https://youtu.be/b2'], 1);
  assert.equal(orderMap['https://youtu.be/c3'], 2);
  assert.equal(explicitCount, 2);
});
