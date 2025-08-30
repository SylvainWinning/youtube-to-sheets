import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

// Verify that fetchSheetData correctly handles ranges without an upper bound
// and returns all available rows.
test('fetchSheetData retrieves all rows for unbounded range', async () => {
  process.env.VITE_SPREADSHEET_ID = '1234567890123456789012345';
  process.env.VITE_API_KEY = 'test_key';

  const { fetchSheetData } = await import('./fetch.ts');

  const rows = Array.from({ length: 1201 }, () => ['value']);

  mock.method(globalThis as any, 'fetch', async (input: any) => {
    const url = typeof input === 'string' ? input : input.url;
    assert.ok(url.includes(encodeURIComponent('tab!A2:M')));
    return new Response(JSON.stringify({ values: rows }), { status: 200 });
  });

  const result = await fetchSheetData('tab!A2:M');
  assert.equal(result.values.length, 1201);

  mock.restoreAll();
});
