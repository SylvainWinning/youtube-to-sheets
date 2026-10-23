import type { VideoData } from '../types/video.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDate, formatPublishDate } from './timeUtils.ts';
import { sortVideos } from './sortUtils.ts';

test('parseDate interprets DD/MM/YYYY HH:MM as UTC', () => {
  assert.equal(parseDate('17/05/2024 14:30')?.toISOString(), '2024-05-17T14:30:00.000Z');
});

test('parseDate interprets ISO timestamps without a timezone as UTC', () => {
  assert.equal(parseDate('2024-05-17T14:30:00')?.toISOString(), '2024-05-17T14:30:00.000Z');
});

test('parseDate respects an explicit ISO timezone offset', () => {
  assert.equal(parseDate('2024-05-17T14:30:00+02:00')?.toISOString(), '2024-05-17T12:30:00.000Z');
});

test('parseDate parses French date format in the local calendar', () => {
  assert.equal(parseDate('11 avril 2024')?.getTime(), new Date(2024, 3, 11).getTime());
});

// Sheet timestamps with a time are UTC. Freeze the clock and serialize fixtures
// in UTC so these assertions also hold in local timezones and across seasons.
for (const [now, olderDate] of [
  ['2026-01-15T12:00:00Z', '7 janvier 2026'],
  ['2026-07-15T12:00:00Z', '7 juillet 2026'],
]) {
  for (const [ageMs, expected] of [
    [5 * 60 * 1000, 'Il y a 5 minutes'],
    [3 * 60 * 60 * 1000, 'Il y a 3 heures'],
    [3 * 24 * 60 * 60 * 1000, 'Il y a 3 jours'],
    [8 * 24 * 60 * 60 * 1000, olderDate],
  ] as const) {
    test(`formatPublishDate: ${expected} with clock ${now}`, context => {
      context.mock.timers.enable({ apis: ['Date'], now: new Date(now) });
      const recent = new Date(Date.now() - ageMs);
      const iso = recent.toISOString();
      const dateString = `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)} ${iso.slice(11, 16)}`;
      assert.equal(formatPublishDate(dateString), expected);
    });
  }
}

test('sortVideos orders videos by chronological publishedAt', () => {
  const videos = [
    { title: 'A', publishedAt: '11 avril 2024' },
    { title: 'B', publishedAt: '10 avril 2024' },
    { title: 'C', publishedAt: '' }
  ];

  const sorted = sortVideos(videos as unknown as VideoData[], { field: 'publishedAt', direction: 'asc' });
  assert.deepEqual(sorted.map(v => v.title), ['B', 'A', 'C']);
});

for (const value of ['31/02/2024', '31/04/2024 12:00', '29/02/2023 12:00', '2024-02-30T12:00:00Z', '2024-01-01T24:00:00Z', '2024-01-01T12:60:00Z', '17/05/2024 14:30 garbage', '11 avril 2024 xyz', '42', '']) {
  test(`date invalide refusée sans crash : ${value}`, () => {
    assert.equal(parseDate(value), null);
    assert.equal(formatPublishDate(value), 'Date inconnue');
  });
}
test('les jours bissextiles et fractions ISO de l’export Python sont acceptés', () => {
  assert.equal(parseDate("'29/02/2024 12:30")?.toISOString(), '2024-02-29T12:30:00.000Z');
  assert.equal(parseDate('2026-10-23T11:08:15.962487+00:00')?.toISOString(), '2026-10-23T11:08:15.962Z');
});
