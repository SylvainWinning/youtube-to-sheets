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

  const sorted = sortVideos(videos as any, null);

  assert.deepEqual(
    sorted.map(video => video.title),
    ['Plus récente', 'Intermédiaire', 'Ancienne vidéo', 'Sans position définie']
  );
});

test('sortVideos trie les positions numériques par ordre croissant', () => {
  const videos = [
    { title: 'Vidéo ancienne', playlistPosition: '42' },
    { title: 'Vidéo intermédiaire', playlistPosition: '21' },
    { title: 'Vidéo récente', playlistPosition: '7' },
    { title: 'Sans position' }
  ];

  const sorted = sortVideos(videos as any, null);

  assert.deepEqual(
    sorted.map(video => video.title),
    ['Vidéo récente', 'Vidéo intermédiaire', 'Vidéo ancienne', 'Sans position']
  );
});

test('sortVideos préserve l’ordre original quand aucune position n’est exploitable', () => {
  const videos = [
    { title: 'Aucune donnée 1' },
    { title: 'Aucune donnée 2', playlistPosition: '' },
    { title: 'Aucune donnée 3', playlistPosition: '   ' }
  ];

  const sorted = sortVideos(videos as any, null);

  assert.deepEqual(
    sorted.map(video => video.title),
    ['Aucune donnée 1', 'Aucune donnée 2', 'Aucune donnée 3']
  );
});
