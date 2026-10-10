import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assignCategories, getVideoCategory } from './assignCategories.ts';
import { getUniqueCategories } from './getUniqueCategories.ts';
import { filterVideosBySearch } from './searchUtils.ts';
import { mapRowToVideo } from './api/sheets/transform.ts';
import type { VideoData } from '../types/video.ts';

const categories = new Set([
  'Culture', 'Divertissement', 'Finance & Business', 'Musique',
  'Pause dej', 'Tech', 'Youtuber pref',
]);

for (const file of ['../../public/data/videos.json', '../../../data/videos.json']) {
  test(`toutes les chaînes de ${file} ont une catégorie utilisable`, () => {
    const [, ...rows] = JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
    const videos = rows.map((row: unknown[], index: number) => mapRowToVideo(row, index));
    const classified = assignCategories(videos);
    const missing = classified.filter(video => !categories.has(video.myCategory ?? ''));
    assert.deepEqual([...new Set(missing.map(video => video.channel))], [],
      'Ajouter au classement les nouvelles chaînes des playlists');
    assert.equal(classified.length, videos.length);
    // Chaque entrée doit pouvoir être retrouvée via le filtre catégorie de l’app.
    assert.equal([...categories].reduce((count, category) => count
      + classified.filter(video => video.myCategory === category).length, 0), videos.length);
    assert.deepEqual([...new Set(classified.map(video => video.playlistId))].sort(), [
      'PLtBV_WamBQbAxyF08PXaPxfFwcTejP9vR',
      'PLtBV_WamBQbCWySxrSDkbEcTYsxZ8FOvx',
    ]);
  });
}

test('préserve les catégories personnelles et ne modifie pas les données source', () => {
  const existing = Object.freeze({ channel: 'OpenAI', myCategory: 'Culture' }) as VideoData;
  const missing = Object.freeze({ channel: ' Daily Dose Of Internet ', myCategory: ' ' }) as VideoData;
  const videos = Object.freeze([existing, missing]);
  const result = assignCategories([...videos]);
  assert.equal(result[0].myCategory, 'Culture');
  assert.equal(result[1].myCategory, 'Divertissement');
  assert.equal(missing.myCategory, ' ');
  assert.notEqual(result[0], existing);
  assert.deepEqual(getUniqueCategories([...videos]), ['Culture', 'Divertissement']);
});

test('classe avant la recherche, sans dépendre du rendu du menu catégories', () => {
  const videos = assignCategories([
    { channel: 'EKKSTACYVEVO', title: 'Clip', category: '10', myCategory: '' },
    { channel: 'Riley Brown', title: 'Tutorial', category: '28', myCategory: '' },
  ] as VideoData[]);
  assert.deepEqual(filterVideosBySearch(videos, { query: 'musique', fields: ['category'] })
    .map(video => video.channel), ['EKKSTACYVEVO']);
  assert.equal(getVideoCategory(videos[1]), 'Tech');
});
