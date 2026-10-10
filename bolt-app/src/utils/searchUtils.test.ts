import test from 'node:test';
import assert from 'node:assert/strict';
import { filterVideosBySearch } from './searchUtils.ts';
import type { SearchFilters } from '../types/search.ts';
import type { VideoData } from '../types/video.ts';

// Test ensures search on category uses myCategory field

test('filterVideosBySearch utilise myCategory pour le champ category', () => {
  const videos = [
    { title: 'Video1', myCategory: 'News' },
    { title: 'Video2', myCategory: 'Sport' },
  ] as any;
  const filters = { query: 'sport', fields: ['category'] } satisfies SearchFilters;
  const result = filterVideosBySearch(videos, filters);
  assert.deepEqual(result, [videos[1]]);
});

const catalogue = [
  { title: 'L’entreprise révolutionne le cœur de l’économie', channel: 'Hardisk', myCategory: 'Tech', category: 'Science' },
  { title: 'La révolution arrive', channel: 'Autre chaîne', myCategory: 'Culture' },
  { title: 'Révolution technique', channel: 'Autre chaîne', myCategory: 'Tech' },
  { title: 'Économie mondiale', channel: 'Hardisk', myCategory: 'Finance & Business' },
] as VideoData[];

const search = (query: string, fields: SearchFilters['fields'] = ['title', 'channel', 'category']) =>
  filterVideosBySearch(catalogue, { query, fields });

test('les accents composés/décomposés, la casse et les ligatures donnent les mêmes résultats', () => {
  for (const query of ['revolution', 'révolution', 'RE\u0301VOLUTION']) {
    assert.deepEqual(search(query), catalogue.slice(0, 3));
  }
  assert.deepEqual(search('coeur economie'), [catalogue[0]]);
});

test('apostrophes droites, courbes, Unicode et absentes sont équivalentes', () => {
  for (const query of ["l'entreprise", 'l’entreprise', 'lʼentreprise', 'l‘entreprise', 'lentreprise']) {
    assert.deepEqual(search(query), [catalogue[0]]);
  }
});

test('tous les mots sont nécessaires, dans tout ordre et entre champs sélectionnés', () => {
  for (const query of ['hardisk revolution', 'révolution Hardisk', ' hardisk  révolution\ntech ']) {
    assert.deepEqual(search(query), [catalogue[0]]);
  }
  assert.deepEqual(search('hardisk revolution introuvable'), []);
  assert.deepEqual(search('hardisk revolution', ['title']), []);
});

test('les signes de ponctuation séparent les mots, sans donner tous les résultats à une requête vide de mots', () => {
  assert.deepEqual(search('hardisk, révolution!'), [catalogue[0]]);
  assert.deepEqual(search('---\" & !'), []);
  assert.deepEqual(search('xyz'.repeat(1000)), []);
});

test('les termes peuvent rester partiels et répétés, et les espaces seuls effacent le filtre', () => {
  assert.deepEqual(search('revol revol'), catalogue.slice(0, 3));
  assert.equal(search(' \t\n '), catalogue);
  assert.equal(search('revolution', []), catalogue);
});

test('la catégorie personnelle seule est recherchée et les champs absents ne provoquent pas d’erreur', () => {
  assert.deepEqual(search('science', ['category']), []);
  assert.deepEqual(search('tech', ['category']), [catalogue[0], catalogue[2]]);
  assert.deepEqual(filterVideosBySearch([{ title: 'Révolution' } as VideoData], {
    query: 'chaine', fields: ['channel', 'category'],
  }), []);
});

test('la recherche conserve les références, l’ordre et les données du catalogue', () => {
  const before = JSON.stringify(catalogue);
  const reversed = [...catalogue].reverse();
  const result = filterVideosBySearch(reversed, { query: 'revolution', fields: ['title'] });
  assert.deepEqual(result, [catalogue[2], catalogue[1], catalogue[0]]);
  assert.equal(result[0], catalogue[2]);
  assert.equal(JSON.stringify(catalogue), before);
});
