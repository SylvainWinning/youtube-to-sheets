import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDate, formatPublishDate } from './timeUtils.ts';
import { sortVideos } from './sortUtils.ts';

test('parseDate parses DD/MM/YYYY HH:MM format', () => {
  const result = parseDate('17/05/2024 14:30');
  assert.ok(result);
  assert.equal(result?.getFullYear(), 2024);
  assert.equal(result?.getMonth(), 4);
  assert.equal(result?.getDate(), 17);
  assert.equal(result?.getHours(), 14);
  assert.equal(result?.getMinutes(), 30);
});

test('parseDate parses French date format', () => {
  const result = parseDate('11 avril 2024');
  assert.ok(result);
  assert.equal(result?.getFullYear(), 2024);
  assert.equal(result?.getMonth(), 3);
  assert.equal(result?.getDate(), 11);
});

test('formatPublishDate handles minutes', () => {
  const now = new Date();
  const recent = new Date(now.getTime() - 5 * 60 * 1000);
  const dd = String(recent.getDate()).padStart(2, '0');
  const mm = String(recent.getMonth() + 1).padStart(2, '0');
  const yyyy = recent.getFullYear();
  const hh = String(recent.getHours()).padStart(2, '0');
  const min = String(recent.getMinutes()).padStart(2, '0');
  const dateString = `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  const expected = 'Il y a 5 minutes';
  assert.equal(formatPublishDate(dateString), expected);
});

test('formatPublishDate handles hours', () => {
  const now = new Date();
  const recent = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const dd = String(recent.getDate()).padStart(2, '0');
  const mm = String(recent.getMonth() + 1).padStart(2, '0');
  const yyyy = recent.getFullYear();
  const hh = String(recent.getHours()).padStart(2, '0');
  const min = String(recent.getMinutes()).padStart(2, '0');
  const dateString = `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  const expected = 'Il y a 3 heures';
  assert.equal(formatPublishDate(dateString), expected);
});

test('formatPublishDate handles days', () => {
  const now = new Date();
  const recent = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const dd = String(recent.getDate()).padStart(2, '0');
  const mm = String(recent.getMonth() + 1).padStart(2, '0');
  const yyyy = recent.getFullYear();
  const hh = String(recent.getHours()).padStart(2, '0');
  const min = String(recent.getMinutes()).padStart(2, '0');
  const dateString = `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  const expected = 'Il y a 3 jours';
  assert.equal(formatPublishDate(dateString), expected);
});

test('formatPublishDate handles dates older than a week', () => {
  const now = new Date();
  const older = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
  const dd = String(older.getDate()).padStart(2, '0');
  const mm = String(older.getMonth() + 1).padStart(2, '0');
  const yyyy = older.getFullYear();
  const hh = String(older.getHours()).padStart(2, '0');
  const min = String(older.getMinutes()).padStart(2, '0');
  const dateString = `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  const expected = new Intl.DateTimeFormat('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }).format(older);
  assert.equal(formatPublishDate(dateString), expected);
});

test('sortVideos orders videos by chronological publishedAt', () => {
  const videos = [
    { title: 'A', publishedAt: '11 avril 2024' },
    { title: 'B', publishedAt: '10 avril 2024' },
    { title: 'C', publishedAt: '' }
  ];

  const sorted = sortVideos(videos as any, { field: 'publishedAt', direction: 'asc' });
  assert.deepEqual(sorted.map(v => v.title), ['B', 'A', 'C']);
});
