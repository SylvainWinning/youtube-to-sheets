import type { VideoData } from '../types/video.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { sortVideos } from './sortUtils.ts';

test('sortVideos respecte la position de playlist même avec des valeurs sous forme de chaîne', () => {
  const videos = [
    { title: 'Ancienne vidéo', playlistPosition: '2' },
    { title: 'Plus récente', playlistPosition: '0' },
    { title: 'Intermédiaire', playlistPosition: '1' },
    { title: 'Sans position définie' }
  ];

  const sorted = sortVideos(videos.map(video => ({ ...video, playlistId: 'playlist' })) as unknown as VideoData[], null, 'playlist');

  assert.deepEqual(
    sorted.map(video => video.title),
    ['Plus récente', 'Intermédiaire', 'Ancienne vidéo', 'Sans position définie']
  );
});


test('toutes les playlists classe par publication sans mélanger leurs positions', () => {
  const videos = [
    { title: 'Ancienne en tête', playlistPosition: '0', publishedAt: '2025-10-11T12:00:00Z' },
    { title: 'Récente', playlistPosition: '5', publishedAt: '2026-11-07T12:00:00Z' },
    { title: 'Sans date', playlistPosition: '0' },
  ] as unknown as VideoData[];
  assert.deepEqual(sortVideos(videos, null).map(video => video.title), ['Récente', 'Ancienne en tête', 'Sans date']);
  assert.equal(videos[0].title, 'Ancienne en tête');
});
