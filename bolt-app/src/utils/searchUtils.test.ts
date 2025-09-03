import test from 'node:test';
import assert from 'node:assert/strict';
import { filterVideosBySearch } from './searchUtils.ts';

// Test ensures search on category uses myCategory field

test('filterVideosBySearch utilise myCategory pour le champ category', () => {
  const videos = [
    { title: 'Video1', myCategory: 'News' },
    { title: 'Video2', myCategory: 'Sport' },
  ] as any;
  const filters = { query: 'sport', fields: ['category'] } as const;
  const result = filterVideosBySearch(videos, filters);
  assert.deepEqual(result, [videos[1]]);
});
