import test from 'node:test';
import assert from 'node:assert/strict';
import { getUniqueCategories } from './getUniqueCategories.ts';

test('getUniqueCategories utilise myCategory et trie correctement', () => {
  const videos = [
    { myCategory: 'Alpha' },
    { myCategory: 'Beta' },
    { myCategory: 'Alpha' },
    { myCategory: '' },
    {}
  ];
  assert.deepEqual(getUniqueCategories(videos as any, 'asc'), ['Alpha', 'Beta', 'Non classées']);
  assert.deepEqual(getUniqueCategories(videos as any, 'desc'), ['Non classées', 'Beta', 'Alpha']);
});
