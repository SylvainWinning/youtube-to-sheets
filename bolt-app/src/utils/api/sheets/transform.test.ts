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
