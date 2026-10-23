import test from 'node:test';
import assert from 'node:assert/strict';
import { filterVideosBySearch, rankVideosBySearch } from './searchUtils.ts';
import type { SearchFilters } from '../types/search.ts';
import type { VideoData } from '../types/video.ts';

// Test ensures search on category uses myCategory field

test('filterVideosBySearch utilise myCategory pour le champ category', () => {
  const videos = [
    { title: 'Video1', myCategory: 'News' },
    { title: 'Video2', myCategory: 'Sport' },
  ] as unknown as VideoData[];
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
  assert.deepEqual(search('---" & !'), []);
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

test('les libellés de catégories lisibles et les anciens noms retrouvent les mêmes vidéos sans réécrire les données', () => {
  const videos = [
    { ...catalogue[0], myCategory: 'Pause dej' },
    { ...catalogue[1], myCategory: 'Youtuber pref' },
  ];
  for (const query of ['Pause déjeuner', 'Pause dej']) {
    assert.deepEqual(filterVideosBySearch(videos, { query, fields: ['category'] }), [videos[0]]);
  }
  for (const query of ['Créateurs favoris', 'Youtuber pref']) {
    assert.deepEqual(filterVideosBySearch(videos, { query, fields: ['category'] }), [videos[1]]);
  }
  assert.deepEqual(videos.map(video => video.myCategory), ['Pause dej', 'Youtuber pref']);
});

test('IA est un mot ou sigle complet, y compris après apostrophe et avec des points', () => {
  const videos = ['Sebastian Marx', 'Salaire médian', 'Un sujet chiant', "L’IA au quotidien", "L'I.A transforme le travail", 'IA et cinéma']
    .map(title => ({ title, channel: '' }) as VideoData);
  assert.deepEqual(filterVideosBySearch(videos, { query: 'IA', fields: ['title'] }), videos.slice(3));
});

test('les petits mots restent des débuts de mots, les noms se saisissent progressivement', () => {
  const videos = ['Tu préfères', 'Tes YouTubers préférés', 'Éric Judor'].map(title => ({ title }) as VideoData);
  assert.deepEqual(filterVideosBySearch(videos, { query: 'tu préfères', fields: ['title'] }), [videos[0]]);
  for (const query of ['Ér', 'eri', 'Eric']) {
    assert.deepEqual(filterVideosBySearch(videos, { query, fields: ['title'] }), [videos[2]]);
  }
});

test('la pertinence privilégie mots et champs exacts, conserve les références et stabilise les égalités', () => {
  const videos = ['Défigure', 'Figure à découvrir', 'Figure', 'Figure et forme'].map(title => ({ title }) as VideoData);
  const filters = { query: 'figure', fields: ['title'] } satisfies SearchFilters;
  const before = JSON.stringify(videos);
  assert.deepEqual(rankVideosBySearch(filterVideosBySearch(videos, filters), filters), [videos[2], videos[1], videos[3], videos[0]]);
  assert.equal(JSON.stringify(videos), before);
});
