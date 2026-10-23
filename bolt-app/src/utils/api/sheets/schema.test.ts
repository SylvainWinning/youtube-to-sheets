import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VIDEO_COLUMNS, readVideoSnapshot, readSheetValues, readSyncMetadata } from './schema.ts';
import { transformVideoRows } from './transform.ts';

const row = ['', 'Fixture', 'https://youtu.be/aBcDeFgHiJk', 'Channel', '2024-02-29T12:30:00Z', '00:03:00', 0, 0, 0, '', '', '', '', '', 4, 'PL_fixture', 'UC_fixture'];

test('copie v1, tableau historique et enveloppe sans version utilisent exactement la même transformation', () => {
  const table = [[...VIDEO_COLUMNS], row];
  const direct = transformVideoRows(readSheetValues({ values: table }));
  for (const value of [table, { videos: table }, { schemaVersion: 1, videos: table }, [row]]) {
    assert.deepEqual(transformVideoRows(readVideoSnapshot(value).rows), direct);
  }
  assert.equal(direct[0].channelId, 'UC_fixture');
  assert.equal(direct[0].playlistPosition, 4);
  const withoutPosition = row.slice(0, 14);
  assert.deepEqual(transformVideoRows([[...VIDEO_COLUMNS], withoutPosition]), transformVideoRows([withoutPosition]));
});

test('versions futures et colonnes v1 déplacées sont refusées, sans interprétation silencieuse', () => {
  for (const schemaVersion of [2, 0, '1', null]) {
    assert.throws(() => readVideoSnapshot({ schemaVersion, videos: [[...VIDEO_COLUMNS], row] }), /Version/);
  }
  const moved = [...VIDEO_COLUMNS]; [moved[1], moved[2]] = [moved[2], moved[1]];
  assert.throws(() => readVideoSnapshot({ schemaVersion: 1, videos: [moved, row] }), /Colonnes/);
  for (const value of [null, {}, { videos: {} }, [[], { title: 'invalid' }]]) {
    assert.throws(() => readVideoSnapshot(value), /Format/);
  }
});

test('réponses Sheets mal formées ou orientées en colonnes sont refusées; un onglet vide reste permis', () => {
  for (const value of [null, [], { error: 'quota' }, { values: 'bad' }, { values: [{}] }, { majorDimension: 'COLUMNS', values: [[1]] }]) {
    assert.throws(() => readSheetValues(value));
  }
  assert.deepEqual(readSheetValues({ range: 'A:Q', majorDimension: 'ROWS' }), []);
});

test('dates et compte incohérents ne peuvent pas attester une synchronisation complète', () => {
  const videos = transformVideoRows([row]);
  const valid = { status: 'complete', source: 'youtube', videoCount: 1, lastSuccessfulSync: '2024-02-29T12:30:00.123456+00:00' };
  assert.deepEqual(readSyncMetadata(valid, videos), valid);
  for (const change of [{ videoCount: 2 }, { lastSuccessfulSync: '2024-02-30T00:00:00Z' }, { lastSuccessfulSync: null }]) {
    assert.equal(readSyncMetadata({ ...valid, ...change }, videos), undefined);
  }
});

test('le JSON publié conserve toutes les occurrences, dates et comptes de provenance', () => {
  const json = JSON.parse(readFileSync(new URL('../../../../../data/videos.json', import.meta.url), 'utf8'));
  const snapshot = readVideoSnapshot(json);
  const videos = transformVideoRows(snapshot.rows);
  assert.equal(videos.length, snapshot.rows.length);
  assert.ok(videos.every(video => video.publishedAt !== ''));
  assert.equal(readSyncMetadata(snapshot.metadata, videos)?.videoCount, new Set(videos.map(video => video.link)).size);
});
