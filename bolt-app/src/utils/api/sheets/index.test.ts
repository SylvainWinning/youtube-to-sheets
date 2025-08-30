import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { fetchAllVideos } from './index.ts';
import { getConfig } from '../../constants.ts';

test('fetchAllVideos uses local data when config error', async () => {

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
  assert.equal(result.error, error);
  assert.ok(result.metadata?.errors?.includes(error));

  mock.restoreAll();
});

