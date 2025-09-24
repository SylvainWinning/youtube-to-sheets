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
