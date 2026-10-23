import test from 'node:test';
import assert from 'node:assert/strict';
import type { VideoData } from '../types/video.ts';
import { drawVideo } from './videoChoice.ts';
import { getVideoIdentity, uniqueVideoCandidates } from './videoLibrary.ts';
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

test('tirage limité à la recherche, catégorie, playlist et durée déjà filtrées', () => {
  const searched = filterVideosBySearch([a, b, c], { query: 'Test', fields: ['title'] });
  const category = searched.filter(v => v.myCategory === 'Tech');
  const playlist = filterVideosByPlaylist(category, 'A');
  const duration = filterVideosByDuration(playlist, { name: 'Court', range: 'A:Q', durationRange: { min: 0, max: 5 } });
  const candidates = uniqueVideoCandidates(duration);
  assert.deepEqual(candidates, [a, b]);
  assert.equal(drawVideo(candidates, null, () => 0), a);
  assert.equal(drawVideo(candidates, null, () => 0.999), b);
});

test('déduplication, aucune répétition immédiate et épuisement explicite', () => {
  const source = [a, { ...a, link: 'https://www.youtube.com/watch?v=aBcDeFgHiJk' }, b];
  assert.deepEqual(uniqueVideoCandidates(source), [a, b]);
  assert.equal(drawVideo([a, b], getVideoIdentity(a), () => 0), b);
  assert.equal(drawVideo([a], getVideoIdentity(a)), null);
  assert.equal(drawVideo([], null), null);
  assert.equal(source.length, 3);
});

test('le tirage répartit équitablement les chances entre vidéos uniques malgré les doublons de playlists', () => {
  const pool = uniqueVideoCandidates([a, { ...a, playlistId: 'B' }, b, c]);
  const counts = new Map<string, number>();
  for (let i = 0; i < 300; i++) {
    const selected = drawVideo(pool, null, () => (i + 0.5) / 300)!;
    const id = getVideoIdentity(selected);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  assert.deepEqual([...counts.values()], [100, 100, 100]);
});
