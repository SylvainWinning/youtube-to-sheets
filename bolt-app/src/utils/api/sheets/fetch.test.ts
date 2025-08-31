import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

// Verify that fetchSheetData correctly handles ranges without an upper bound
// and returns all available rows.
test('fetchSheetData retrieves all rows for unbounded range', async () => {
  const rows = Array.from({ length: 1201 }, () => ['value']);

  const originalSpreadsheetId = process.env.SPREADSHEET_ID;
  const originalApiKey = process.env.YOUTUBE_API_KEY;
  process.env.SPREADSHEET_ID = 'test-id';
  process.env.YOUTUBE_API_KEY = 'test-key';

  try {
    const { fetchSheetData } = await import('./fetch.ts');

    mock.method(globalThis as any, 'fetch', async (input: any) => {
      const url = typeof input === 'string' ? input : input.url;
      assert.ok(url.includes(encodeURIComponent('tab!A2:M')));
      return new Response(JSON.stringify({ values: rows }), { status: 200 });
    });

    const result = await fetchSheetData('tab!A2:M');
    assert.equal(result.values.length, 1201);
  } finally {
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
  }
});
