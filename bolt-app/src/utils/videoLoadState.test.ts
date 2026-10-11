import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyVideoLoadState, resolveVideoLoad } from './videoLoadState.ts';
import type { VideoData } from '../types/video.ts';
const local = [{ title: 'Local', link: 'https://youtu.be/local', channel: 'Hardisk' }] as VideoData[];
const remote = [{ title: 'Remote', link: 'https://youtu.be/remote', channel: 'OpenAI' }] as VideoData[];
const fallback = { data: local, metadata: { source: 'local' as const, timestamp: 200, publishedAt: 100, warnings: ['Sheets failed'] } };
const success = { data: remote, metadata: { source: 'sheets' as const, timestamp: 300 } };

test('le secours est affiché et catégorisé avec un avertissement et deux dates distinctes', () => {
  const state = resolveVideoLoad(fallback, emptyVideoLoadState);
  assert.equal(state.videos[0].title, 'Local');
  assert.equal(state.videos[0].myCategory, 'Pause dej');
  assert.equal(state.error, null);
  assert.ok(state.warning);
  assert.equal(state.loadedAt, 200);
  assert.equal(state.publishedAt, 100);
});
test('une panne conserve le dernier succès, même si une copie locale plus ancienne existe', () => {
  const previous = resolveVideoLoad(success, emptyVideoLoadState);
  for (const response of [fallback, { data: [], error: 'HTTP 503' }, { data: [] }]) {
    const state = resolveVideoLoad(response, previous, false);
    assert.equal(state.videos, previous.videos);
    assert.equal(state.loadedAt, 300);
    assert.equal(state.source, 'sheets');
    assert.ok(state.warning);
    assert.equal(state.error, null);
  }
});
test('sans source valide, une erreur reste bloquante et distingue le mode hors ligne', () => {
  for (const online of [true, false]) {
    const state = resolveVideoLoad({ data: [], error: 'HTTP 503' }, emptyVideoLoadState, online);
    assert.equal(state.videos.length, 0);
    assert.ok(state.error);
    assert.equal(state.error.includes('hors ligne'), !online);
    assert.equal(state.warning, null);
    assert.equal(state.loadedAt, null);
  }
});
test('un corps rempli ne rend pas valide une réponse HTTP en erreur', () => {
  assert.equal(resolveVideoLoad({ data: local, error: 'HTTP 503' }, emptyVideoLoadState).videos.length, 0);
});
test('un succès après la panne efface l’avertissement et la date du secours', () => {
  const state = resolveVideoLoad(success, resolveVideoLoad(fallback, emptyVideoLoadState));
  assert.equal(state.videos[0].title, 'Remote');
  assert.equal(state.warning, null);
  assert.equal(state.error, null);
  assert.equal(state.publishedAt, undefined);
  assert.equal(state.loadedAt, 300);
});
test('une publication inconnue ne devient pas la date du chargement', () => {
  const state = resolveVideoLoad({ data: local, metadata: { source: 'local', timestamp: 200, warnings: ['offline'] } }, emptyVideoLoadState);
  assert.equal(state.publishedAt, undefined);
  assert.equal(state.loadedAt, 200);
});
