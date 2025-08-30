import test from 'node:test';
import assert from 'node:assert/strict';
import { extractYouTubeId, generateThumbnail } from './youtube.ts';

test('extractYouTubeId preserves mixed-case video IDs', () => {
  const url = 'https://YouTube.com/watch?v=aBcDeFgHiJk';
  const id = extractYouTubeId(url);
  assert.equal(id, 'aBcDeFgHiJk');
});

test('generateThumbnail returns valid URL for mixed-case IDs', () => {
  const url = 'https://YoUtU.Be/aBcDeFgHiJk';
  const thumbnail = generateThumbnail(url);
  assert.equal(thumbnail, 'https://img.youtube.com/vi/aBcDeFgHiJk/hqdefault.jpg');
});
