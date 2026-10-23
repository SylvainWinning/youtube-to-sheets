import test from 'node:test';
import assert from 'node:assert/strict';
import { createChoiceStore } from './choiceStore.ts';
import { CHOICE_STORAGE_KEY } from './videoChoice.ts';

function fixture() {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
  return { data, storage };
}

test('cartes et aperçu partagent les changements sans écraser la préférence ni les autres marquages', () => {
  const { storage } = fixture();
  const store = createChoiceStore(() => storage);
  let cardUpdates = 0, chooserUpdates = 0;
  const stopCard = store.subscribe(() => cardUpdates++);
  const stopChooser = store.subscribe(() => chooserUpdates++);
  assert.equal(store.getSnapshot(), store.getSnapshot());
  store.setWatched('youtube:aaaaaaaaaaa', true);
  store.setExcludeWatched(true);
  store.setWatched('youtube:bbbbbbbbbbb', true);
  store.setWatched('youtube:aaaaaaaaaaa', true);
  store.setWatched('youtube:aaaaaaaaaaa', false);
  assert.deepEqual(store.getSnapshot().preferences, { watched: ['youtube:bbbbbbbbbbb'], excludeWatched: true });
  assert.equal(cardUpdates, 5); assert.equal(chooserUpdates, 5);
  assert.deepEqual(createChoiceStore(() => storage).getSnapshot(), store.getSnapshot());
  stopCard(); stopChooser();
});

test('mise à jour inter-onglets et effacement du stockage, un seul abonnement externe', () => {
  const { data, storage } = fixture();
  let externalRefresh = () => {}, subscribed = 0, stopped = 0;
  const store = createChoiceStore(() => storage, refresh => { externalRefresh = refresh; subscribed++; return () => { stopped++; }; });
  const stopA = store.subscribe(() => {}), stopB = store.subscribe(() => {});
  assert.equal(subscribed, 1);
  data.set(CHOICE_STORAGE_KEY, JSON.stringify({ watched: ['youtube:ccccccccccc'], excludeWatched: true }));
  externalRefresh();
  assert.deepEqual(store.getSnapshot().preferences.watched, ['youtube:ccccccccccc']);
  data.clear(); externalRefresh();
  assert.deepEqual(store.getSnapshot().preferences, { watched: [], excludeWatched: false });
  stopA(); assert.equal(stopped, 0); stopB(); assert.equal(stopped, 1);
});

test('stockage refusé : état partagé utilisable et erreur signalée sans perdre le choix', () => {
  const store = createChoiceStore(() => { throw new Error('Denied'); });
  store.setWatched('youtube:aaaaaaaaaaa', true);
  store.setExcludeWatched(true);
  const stop = store.subscribe(() => {});
  assert.deepEqual(store.getSnapshot(), { preferences: { watched: ['youtube:aaaaaaaaaaa'], excludeWatched: true }, storageError: true });
  store.setWatched('youtube:aaaaaaaaaaa', false);
  assert.deepEqual(store.getSnapshot().preferences, { watched: [], excludeWatched: true });
  stop();
});
