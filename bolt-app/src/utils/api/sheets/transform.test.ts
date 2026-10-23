import test from 'node:test';
import assert from 'node:assert/strict';
import { mapRowToVideo } from './transform.ts';

test('mapRowToVideo lit la colonne playlistPosition si disponible', () => {
  const row = [
    'https://example.com/avatar.jpg',
    'Titre de test',
    'https://www.youtube.com/watch?v=abc123',
    'Chaîne',
    '2024-01-01T00:00:00Z',
    '00:10',
    '100',
    '10',
    '5',
    'Description',
    'tag1, tag2',
    '22',
    'https://example.com/thumb.jpg',
    'Cat perso',
    '42'
  ];

  const video = mapRowToVideo(row, 7);

  assert.equal(video.playlistPosition, 42);
});

test('mapRowToVideo retombe sur l\'index lorsque la colonne est absente', () => {
  const row = [
    'https://example.com/avatar.jpg',
    'Ancienne donnée',
    'https://www.youtube.com/watch?v=def456',
    'Chaîne',
    '2024-02-01T00:00:00Z',
    '00:05',
    '200',
    '20',
    '10',
    'Description',
    'tag3, tag4',
    '22',
    'https://example.com/thumb.jpg'
  ];

  const video = mapRowToVideo(row, 5);

  assert.equal(video.playlistPosition, 5);
});

test('mapRowToVideo ignore une valeur non numérique de playlistPosition', () => {
  const row = [
    'https://example.com/avatar.jpg',
    'Valeur invalide',
    'https://www.youtube.com/watch?v=ghi789',
    'Chaîne',
    '2024-03-01T00:00:00Z',
    '00:07',
    '300',
    '30',
    '15',
    'Description',
    'tag5',
    '22',
    'https://example.com/thumb.jpg',
    '',
    'not-a-number'
  ];

  const video = mapRowToVideo(row, 9);

  assert.equal(video.playlistPosition, 9);
});

test('la colonne Q transporte un identifiant de chaîne sans casser les anciens exports', () => {
  const row = new Array(17).fill(''); row[16] = 'UCabcdefghijklmnopqrstuv';
  assert.equal(mapRowToVideo(row).channelId, row[16]);
  assert.equal(mapRowToVideo(row.slice(0, 16)).channelId, '');
});

test('une image malformée ne rejette pas la vidéo et les champs objets ne deviennent pas du texte', async () => {
  const { transformVideoRows } = await import('./transform.ts');
  const row = [{ invalid: true }, ' Vidéo valide ', 'https://youtu.be/aBcDeFgHiJk', 'Chaîne', '31/02/2024 12:00', '00:03:00', 0, 0, 0, { bad: true }, '', '', 'javascript:alert(1)'];
  const videos = transformVideoRows([['invalid'], row]);
  assert.equal(videos.length, 1);
  assert.equal(videos[0].title, 'Vidéo valide');
  assert.equal(videos[0].channelAvatar, '');
  assert.equal(videos[0].thumbnail, 'https://i.ytimg.com/vi/aBcDeFgHiJk/hqdefault.jpg');
  assert.equal(videos[0].publishedAt, '');
  assert.equal(videos[0].shortDescription, '');
  assert.equal(videos[0].views, '0');
  assert.equal(videos[0].playlistPosition, 1);
});

test('les liens non ouvrables sont exclus; les positions négatives/fractionnaires retombent sur la ligne', async () => {
  const { transformVideoRows } = await import('./transform.ts');
  for (const link of ['javascript:alert(1)', 'https://evil.test/watch?v=aBcDeFgHiJk', 'https://youtu.be/invalid']) {
    assert.deepEqual(transformVideoRows([['', 'Titre', link]]), []);
  }
  for (const position of [-1, 2.5, Number.MAX_SAFE_INTEGER + 1, true]) {
    const row: unknown[] = ['', 'Titre', 'https://youtu.be/aBcDeFgHiJk']; row[14] = position;
    assert.equal(mapRowToVideo(row, 8).playlistPosition, 8);
  }
});
