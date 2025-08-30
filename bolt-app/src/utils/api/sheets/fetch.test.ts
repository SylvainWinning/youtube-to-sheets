import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { fetchSheetData, type SheetsConfig } from './fetch.ts';

// Verify that fetchSheetData correctly handles ranges without an upper bound
// and returns all available rows.
test('fetchSheetData retrieves all rows for unbounded range', async () => {
  const rows = Array.from({ length: 1201 }, () => ['value']);

  mock.method(globalThis as any, 'fetch', async (input: any) => {
    const url = typeof input === 'string' ? input : input.url;
    assert.ok(url.includes(encodeURIComponent('tab!A2:M')));
    return new Response(JSON.stringify({ values: rows }), { status: 200 });
  });

  const config: SheetsConfig = { SPREADSHEET_ID: 'spreadsheet', API_KEY: 'key' };
  const result = await fetchSheetData('tab!A2:M', config);
  assert.equal(result.values.length, 1201);

  mock.restoreAll();
});
