import test from 'node:test';
import assert from 'node:assert/strict';
import { extractYouTubeId } from './youtube.ts';

test('extractYouTubeId preserves mixed-case video IDs', () => {
  const url = 'https://YouTube.com/watch?v=aBcDeFgHiJk';
  const id = extractYouTubeId(url);
  assert.equal(id, 'aBcDeFgHiJk');
});

