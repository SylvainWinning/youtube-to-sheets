import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getVideoTopics, getVideoCollections, filterVideoFacets } from './videoFacets.ts';
import { resolveVideoLoad, emptyVideoLoadState } from './videoLoadState.ts';
import { mapRowToVideo } from './api/sheets/transform.ts';
import { getVideoCategory } from './assignCategories.ts';
import type { VideoData } from '../types/video.ts';

test('Pixel reste dans les favoris et devient retrouvable dans Tech, sans doublon', () => {
  const input = Object.freeze({ title: 'Pixel', channel: 'Marques Brownlee', channelId: 'UCBJycsmduvYEL83R_U4JriQ',
    category: '28', myCategory: '', link: 'https://youtu.be/aBcDeFgHiJk' }) as VideoData;
  const { videos } = resolveVideoLoad({ data: [input, { ...input, playlistId: 'autre' }] }, emptyVideoLoadState);
  assert.deepEqual(videos[0].topics, ['Tech']);
  assert.deepEqual(videos[0].collections, ['Youtuber pref']);
  assert.equal(filterVideoFacets(videos, 'Tech', 'Youtuber pref').length, 1);
  assert.equal(input.myCategory, '');
});

test('les appartenances actuelles aux collections sont conservées pour tout le catalogue publié', () => {
  const snapshot = JSON.parse(readFileSync(new URL('../../public/data/videos.json', import.meta.url), 'utf8'));
  const [, ...rows] = Array.isArray(snapshot) ? snapshot : snapshot.videos;
  const inputs = rows.map((row: unknown[], i: number) => mapRowToVideo(row, i));
  const library = resolveVideoLoad({ data: inputs }, emptyVideoLoadState).videos;
  for (const collection of ['Pause dej', 'Youtuber pref']) {
    const expected = new Set(inputs.filter((video: VideoData) => getVideoCategory(video) === collection).map((video: VideoData) => video.link));
    const actual = new Set(library.filter(video => getVideoCollections(video).includes(collection)).map(video => video.link));
    assert.deepEqual(actual, expected);
  }
});

test('le thème peut varier entre vidéos d’une même chaîne ; exceptions stables et catégories personnelles sont préservées', () => {
  const base = { channelId: 'UCstable', myCategory: 'Pause dej', category: '28', link: 'https://youtu.be/aBcDeFgHiJk' } as VideoData;
  assert.deepEqual(getVideoTopics(base), ['Tech']);
  assert.deepEqual(getVideoTopics({ ...base, category: '10' }), ['Musique']);
  const rules = { channels: { UCstable: 'Culture' }, videos: { aBcDeFgHiJk: ['Tech', 'Culture'] }, youtubeCategories: { '28': 'Tech' } };
  assert.deepEqual(getVideoTopics(base, rules), ['Tech', 'Culture']);
  assert.deepEqual(getVideoTopics({ ...base, myCategory: 'Personnel' }, rules), ['Personnel']);
  assert.deepEqual(getVideoTopics({ ...base, category: '9999' }), ['Non classées']);
  assert.deepEqual(getVideoTopics({ ...base, channel: 'OpenAI', myCategory: '' }, rules), ['Tech', 'Culture']);
});

test('deux occurrences conservent leurs collections et thèmes sans créer deux cartes', () => {
  const base = { channel: 'Synthétique', link: 'https://youtu.be/aBcDeFgHiJk', category: '28' } as VideoData;
  const { videos } = resolveVideoLoad({ data: [
    { ...base, myCategory: 'Youtuber pref' },
    { ...base, myCategory: 'Pause dej', category: '10', playlistId: 'autre' },
  ] }, emptyVideoLoadState);
  assert.equal(videos.length, 1);
  assert.deepEqual(videos[0].collections, ['Youtuber pref', 'Pause dej']);
  assert.deepEqual(videos[0].topics, ['Tech', 'Musique']);
});
