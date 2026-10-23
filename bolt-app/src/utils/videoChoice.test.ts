import test from 'node:test';
import assert from 'node:assert/strict';
import type { VideoData } from '../types/video.ts';
import { choiceCandidates, drawVideo, readChoicePreferences } from './videoChoice.ts';
import { getVideoIdentity } from './videoLibrary.ts';
import { filterVideosBySearch } from './searchUtils.ts';
import { filterVideosByPlaylist } from './videoLibrary.ts';
import { filterVideosByDuration } from './videoFilters.ts';

const video = (id: string, category: string, playlistId: string, duration: string): VideoData => ({
  title: `Test ${id}`, link: `https://youtu.be/${id}`, myCategory: category, playlistId, duration,
  channel: 'Test', publishedAt: '', views: '', likes: '', comments: '', shortDescription: '', tags: '', thumbnail: '',
});
const a = video('aBcDeFgHiJk', 'Tech', 'A', '03:00');
const b = video('bBcDeFgHiJk', 'Tech', 'A', '03:00');
const c = video('cBcDeFgHiJk', 'Humour', 'B', '15:00');
const preferences = { watched: [getVideoIdentity(a)], excludeWatched: false };

test('tirage limité à la recherche, catégorie, playlist et durée déjà filtrées', () => {
  const searched = filterVideosBySearch([a, b, c], { query: 'Test', fields: ['title'] });
  const category = searched.filter(v => v.myCategory === 'Tech');
  const playlist = filterVideosByPlaylist(category, 'A');
  const duration = filterVideosByDuration(playlist, { name: 'Court', range: 'A:Q', durationRange: { min: 0, max: 5 } });
  const candidates = choiceCandidates(duration, preferences);
  assert.deepEqual(candidates, [a, b]);
  assert.equal(drawVideo(candidates, null, () => 0), a);
  assert.equal(drawVideo(candidates, null, () => 0.999), b);
});

test('exclusion volontaire, déduplication, aucune répétition immédiate et épuisement explicite', () => {
  const source = [a, { ...a, link: 'https://www.youtube.com/watch?v=aBcDeFgHiJk' }, b];
  assert.deepEqual(choiceCandidates(source, preferences), [a, b]);
  assert.deepEqual(choiceCandidates(source, { ...preferences, excludeWatched: true }), [b]);
  assert.equal(drawVideo([a, b], getVideoIdentity(a), () => 0), b);
  assert.equal(drawVideo([a], getVideoIdentity(a)), null);
  assert.equal(drawVideo([], null), null);
  assert.deepEqual(choiceCandidates([a], { ...preferences, excludeWatched: true }), []);
  assert.equal(source.length, 3);
});

test('préférences relues après rechargement, données abîmées et stockage interdit tolérés', () => {
  const saved = { watched: [getVideoIdentity(a), getVideoIdentity(a)], excludeWatched: true };
  assert.deepEqual(readChoicePreferences({ getItem: () => JSON.stringify(saved) }), { ...saved, watched: [getVideoIdentity(a)] });
  for (const raw of ['null', '{', '{"watched":[3],"excludeWatched":true}', '{"watched":[],"excludeWatched":"false"}']) {
    assert.deepEqual(readChoicePreferences({ getItem: () => raw }), { watched: [], excludeWatched: false });
  }
  assert.deepEqual(readChoicePreferences({ getItem: () => { throw new Error('Denied'); } }), { watched: [], excludeWatched: false });
});
