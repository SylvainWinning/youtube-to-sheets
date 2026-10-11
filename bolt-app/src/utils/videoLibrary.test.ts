import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { VideoData } from '../types/video.ts';
import { buildVideoLibrary, filterVideosByPlaylist, getPlaylistIds, getPlaylistPosition, getVideoIdentity } from './videoLibrary.ts';
import { sortVideos } from './sortUtils.ts';
import { getRandomVideo } from './videoUtils.ts';
import { mapRowToVideo } from './api/sheets/transform.ts';
import { resolveVideoLoad, emptyVideoLoadState } from './videoLoadState.ts';
import { filterVideosBySearch } from './searchUtils.ts';

const entry = (id: string, playlistId: string, playlistPosition: number, extra = {}): VideoData => ({
  title: id, link: `https://www.youtube.com/watch?v=${id}`, channel: 'Hardisk', duration: '00:03:00',
  publishedAt: '2026-10-01', views: '100', likes: '1', comments: '0', shortDescription: '', tags: '', thumbnail: '',
  playlistId, playlistPosition, ...extra,
});

test('une vidéo unique conserve les positions distinctes, les répétitions et les playlists même si aucune vidéo exclusive n’existe', () => {
  const inputs = [entry('aBcDeFgHiJk', 'A', 8), entry('aBcDeFgHiJk', 'B', 1), entry('aBcDeFgHiJk', 'A', 4), entry('aBcDeFgHiJk', 'A', 8)];
  inputs.forEach(Object.freeze); Object.freeze(inputs);
  const original = JSON.stringify(inputs);
  const library = buildVideoLibrary(inputs);
  assert.equal(library.length, 1);
  assert.equal(library[0].playlistId, undefined);
  assert.deepEqual(library[0].playlistMemberships, [{ playlistId: 'A', position: 8 }, { playlistId: 'B', position: 1 }, { playlistId: 'A', position: 4 }]);
  assert.deepEqual(getPlaylistIds(library), ['A', 'B']);
  assert.equal(getPlaylistPosition(library[0], 'A'), 4);
  assert.equal(getPlaylistPosition(library[0], 'B'), 1);
  assert.equal(getPlaylistPosition(library[0], null), 8);
  assert.equal(filterVideosByPlaylist(library, 'B')[0], library[0]);
  assert.deepEqual(buildVideoLibrary(library), library);
  assert.equal(JSON.stringify(inputs), original);
});

test('formats et paramètres YouTube convergent sans fusionner les IDs de casse différente ni les hôtes étrangers', () => {
  const id = 'aBcDeFgHiJk';
  for (const link of [`https://www.youtube.com/watch?list=LIST&v=${id}&t=3`, `https://youtu.be/${id}?si=TRACK`, `https://m.youtube.com/shorts/${id}`, `https://www.youtube-nocookie.com/embed/${id}`, `https://youtube.com/live/${id}`, `www.youtube.com/watch?v=${id}`]) {
    assert.equal(getVideoIdentity({ link }), `youtube:${id}`);
  }
  assert.notEqual(getVideoIdentity(entry(id, 'A', 1)), getVideoIdentity(entry(id.toLowerCase(), 'A', 1)));
  assert.notEqual(getVideoIdentity({ link: `https://youtube.com.evil.test/watch?v=${id}` }), `youtube:${id}`);
  assert.equal(buildVideoLibrary([entry(id, 'A', 1), entry(id, 'B', 2, { link: `https://youtu.be/${id}?t=3` })]).length, 1);
  assert.equal(getVideoIdentity({ link: ' not-a-url ' }), 'url:not-a-url');
});

test('chaque playlist retrouve sa propre position et les tris par date restent disponibles', () => {
  const library = buildVideoLibrary([entry('aBcDeFgHiJk', 'A', 1), entry('bBcDeFgHiJk', 'A', 2), entry('aBcDeFgHiJk', 'B', 10), entry('bBcDeFgHiJk', 'B', 0)]);
  assert.deepEqual(sortVideos(filterVideosByPlaylist(library, 'A'), null, 'A').map(v => v.title), ['aBcDeFgHiJk', 'bBcDeFgHiJk']);
  assert.deepEqual(sortVideos(filterVideosByPlaylist(library, 'B'), null, 'B').map(v => v.title), ['bBcDeFgHiJk', 'aBcDeFgHiJk']);
  assert.equal(filterVideosBySearch(library, { query: 'abc', fields: ['title'] }).length, 1);
  assert.equal(sortVideos(library, { field: 'publishedAt', direction: 'desc' }).length, 2);
});

test('le hasard attribue une même part à chaque vidéo, même avec les lignes historiques dupliquées', () => {
  const inputs = [entry('aBcDeFgHiJk', 'A', 0), entry('aBcDeFgHiJk', 'B', 0), entry('bBcDeFgHiJk', 'A', 1), entry('cBcDeFgHiJk', 'B', 1, { duration: '00:10:00' })];
  const counts = new Map<string, number>();
  for (let i = 0; i < 300; i++) {
    const video = getRandomVideo(inputs, null, () => (i + 0.5) / 300)!;
    counts.set(video.title, (counts.get(video.title) ?? 0) + 1);
  }
  assert.deepEqual([...counts.values()], [100, 100, 100]);
  const tab = { name: 'Court', range: 'A:P', durationRange: { min: 0, max: 5 } };
  assert.equal(getRandomVideo(inputs, tab, () => 0.75)?.title, 'bBcDeFgHiJk');
  assert.equal(getRandomVideo([], null), null);
});

test('le JSON réel conserve toutes les appartenances et l’ordre de chaque playlist après chargement et actualisation', () => {
  const [, ...rows] = JSON.parse(readFileSync(new URL('../../../data/videos.json', import.meta.url), 'utf8'));
  const entries: VideoData[] = rows.map(mapRowToVideo);
  const state = resolveVideoLoad({ data: entries }, emptyVideoLoadState);
  assert.equal(state.videos.length, new Set(entries.map(getVideoIdentity)).size);
  assert.deepEqual(getPlaylistIds(state.videos).sort(), [...new Set(entries.map(v => v.playlistId))].sort());
  for (const id of getPlaylistIds(state.videos)) {
    const expected = sortVideos(entries.filter(v => v.playlistId === id), null);
    const actual = sortVideos(filterVideosByPlaylist(state.videos, id), null, id);
    assert.deepEqual(actual.map(getVideoIdentity), [...new Set(expected.map(getVideoIdentity))]);
  }
  for (const entry of entries) {
    const video = state.videos.find(v => v.identity === getVideoIdentity(entry))!;
    assert.ok(video.playlistMemberships.some(m => m.playlistId === entry.playlistId && m.position === entry.playlistPosition));
  }
  assert.deepEqual(resolveVideoLoad({ data: entries }, state).videos, state.videos);
  assert.equal(resolveVideoLoad({ data: [], error: 'offline' }, state, false).videos, state.videos);
});
