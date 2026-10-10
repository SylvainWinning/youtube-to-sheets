import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIBRARY_HISTORY_KEY, readLibraryProgress } from './libraryProgress.ts';

test('restores the loaded range and reading point only for the same ordered results', () => {
  const saved = { [LIBRARY_HISTORY_KEY]: { key: 'same', count: 120, scrollY: 8000, focusIndex: 81 } };
  assert.deepEqual(readLibraryProgress(saved, 'same', 627), saved[LIBRARY_HISTORY_KEY]);
  assert.equal(readLibraryProgress(saved, 'different', 627), null);
});

test('caps a saved range to the catalogue and rejects a removed focus target', () => {
  const saved = { [LIBRARY_HISTORY_KEY]: { key: 'same', count: 80, scrollY: 100, focusIndex: 75 } };
  assert.deepEqual(readLibraryProgress(saved, 'same', 63), { key: 'same', count: 63, scrollY: 100, focusIndex: null });
});

test('ignores incomplete or invalid browser history instead of breaking the library', () => {
  for (const state of [null, {}, { [LIBRARY_HISTORY_KEY]: {} },
    ...[0, -1, 1.5, '80', Infinity].map(count => ({ [LIBRARY_HISTORY_KEY]: { key: 'same', count, scrollY: 0 } })),
    { [LIBRARY_HISTORY_KEY]: { key: 'same', count: 80, scrollY: NaN } }]) {
    assert.equal(readLibraryProgress(state, 'same', 627), null);
  }
});
