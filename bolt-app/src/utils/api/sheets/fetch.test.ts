import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

test('getConfig fournit un message d\'aide quand SPREADSHEET_ID est absent', async () => {
  const originalSpreadsheetId = process.env.SPREADSHEET_ID;
  delete process.env.SPREADSHEET_ID;

  const { getConfig } = await import(`../../constants.ts?fetch=${Date.now()}`);
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
