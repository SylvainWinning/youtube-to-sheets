import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { synchronizeSheets } from './sync.ts';
import { SHEET_TABS } from '../../constants.ts';

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

  // Limit to a single tab to simplify the mock
  SHEET_TABS.length = 1;
  SHEET_TABS[0].range = 'tab!A2:M';

  mock.method(globalThis, 'fetch', async () => {
    return new Response(JSON.stringify({ values: rows }), { status: 200 });
  });

  const videos = await synchronizeSheets();
  assert.equal(videos.length, 1201);

  mock.restoreAll();
});
