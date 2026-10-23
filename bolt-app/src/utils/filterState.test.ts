import test from 'node:test';
import assert from 'node:assert/strict';
import { readFilterState, writeFilterURL } from './filterState.ts';
test('une visite sans état conserve toutes les playlists', () => {
  const state = readFilterState('');
  assert.equal(state.selectedPlaylistId, null);
  assert.equal(state.selectedTab, -1);
  assert.equal(state.sortOptions, null);
});
test('les filtres partagés survivent à un aller-retour URL avec caractères spéciaux', () => {
  const state = readFilterState('?q=été+%26+%23🎬&category=Tech&playlist=PL123&duration=0&sort=oldest');
  const url = writeFilterURL(new URL('https://example.com/app?utm_source=test#library'), state);
  assert.deepEqual(readFilterState(url.search), state);
  assert.equal(url.hash, '#library');
  assert.equal(url.searchParams.get('utm_source'), 'test');
  assert.equal(state.sortOptions?.direction, 'asc');
});
test('les paramètres invalides sont ignorés et effacer conserve les paramètres tiers', () => {
  for (const value of ['-1', 'Infinity', '999999999999', '1.2', '', 'abc']) {
    assert.equal(readFilterState('?duration=' + value + '&sort=invalid').selectedTab, -1);
    assert.equal(readFilterState('?duration=' + value + '&sort=invalid').sortOptions, null);
  }
  const url = writeFilterURL(new URL('https://example.com/?q=test&playlist=PL&duration=0&sort=newest&category=Tech&ref=ok#x'), readFilterState(''));
  assert.equal(url.search, '?ref=ok');
  assert.equal(url.hash, '#x');
});

test('les anciens liens de collections migrent sans perdre le choix personnel', () => {
  const state = readFilterState('?category=Youtuber+pref&sort=newest');
  assert.equal(state.selectedCategory, null);
  assert.equal(state.selectedCollection, 'Youtuber pref');
  const url = writeFilterURL(new URL('https://example.com/?category=Youtuber+pref'), state);
  assert.equal(url.searchParams.get('collection'), 'Youtuber pref');
  assert.equal(url.searchParams.has('category'), false);
  assert.deepEqual(readFilterState(url.search), state);
});

test('thème, collection et durée maximale se partagent sans conflit de paramètres', () => {
  const state = readFilterState('?category=Tech&collection=Youtuber+pref&maxDuration=20&duration=7');
  assert.equal(state.selectedTab, -20);
  const url = writeFilterURL(new URL('https://example.com/?duration=7'), state);
  assert.equal(url.searchParams.has('duration'), false);
  assert.deepEqual(readFilterState(url.search), state);
  for (const invalid of ['0', '19', 'Infinity', '-20', '20x']) {
    assert.equal(readFilterState('?maxDuration=' + invalid).selectedTab, -1);
  }
});
