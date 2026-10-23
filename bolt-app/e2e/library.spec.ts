import { test, expect, type Page, type Route } from '@playwright/test';

// Synthetic catalogue only: tests never fetch the user's library or open YouTube.
const primary = 'PLtBV_WamBQbAxyF08PXaPxfFwcTejP9vR';
const secondary = 'qa-secondary-playlist';
const columns = ['channelAvatar', 'title', 'link', 'channel', 'publishedAt', 'duration', 'views', 'likes', 'comments', 'shortDescription', 'tags', 'category', 'thumbnail', 'myCategory', 'playlistPosition', 'playlistId', 'channelId'];
const rows = Array.from({ length: 50 }, (_, i) => [
  'https://assets.example.test/avatar.svg',
  ['Éric explore les étoiles', 'Éric et la science', 'Codex — vidéo synthétique', 'La technologie au quotidien'][i] ?? `Vidéo synthétique ${i}`,
  `https://www.youtube.com/watch?v=qa${String(i).padStart(9, '0')}`,
  'Chaîne synthétique', '2026-01-01T12:00:00Z',
  i === 0 ? '00:03:00' : i < 4 ? '00:15:00' : '00:08:00',
  '1000', '10', '1', '', '', '28',
  `https://assets.example.test/thumbnail-${i}.svg`,
  i < 2 ? 'Culture' : i < 4 ? 'Tech' : 'Finance & Business',
  i, i % 2 === 0 ? primary : secondary, '',
]);
const snapshot = { schemaVersion: 1, videos: [columns, ...rows, [...rows[0].slice(0, 15), secondary, '']] };
const results = (page: Page) => page.getByRole('region', { name: 'Résultats et filtres actifs' });
const cards = (page: Page) => page.getByRole('region', { name: 'Bibliothèque de vidéos' }).getByRole('article');

async function compact(page: Page) {
  return page.getByRole('button', { name: /^Filtres/ }).isVisible();
}
async function selectCategory(page: Page, label: string) {
  if (await compact(page)) {
    await page.getByRole('button', { name: /^Filtres/ }).click();
    await page.getByRole('combobox', { name: 'Thème des vidéos', exact: true }).selectOption({ label });
    await page.getByRole('button', { name: /^Voir \d+ vidéo/ }).click();
  } else {
    await page.getByRole('button', { name: 'Tous les thèmes', exact: true }).click();
    await page.getByRole('button', { name: label, exact: true }).click();
  }
}
async function expectCount(page: Page, count: number) {
  await expect(results(page).getByText(`${count} résultat${count === 1 ? '' : 's'}`, { exact: true })).toBeVisible();
}
async function expectInViewport(page: Page, locator: ReturnType<Page['getByRole']>) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
}

const crashesByPage = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const crashes: string[] = [];
  crashesByPage.set(page, crashes);
  page.on('pageerror', error => crashes.push(error.message));
  await page.route('**/data/videos.json', route => route.fulfill({ json: snapshot }));
  await page.route('https://assets.example.test/**', route => route.fulfill({
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270"><rect width="480" height="270" fill="#cbd5e1"/><text x="24" y="140" font-size="24">Vidéo de test</text></svg>',
  }));
  await page.goto('./');
  await expectCount(page, 50);
  expect(crashes).toEqual([]);
});

test.afterEach(async ({ page }) => { expect(crashesByPage.get(page)).toEqual([]); });

test('catalogue par défaut, recherche accentuée et récupération de l’état vide', async ({ page }) => {
  await expect(cards(page)).toHaveCount(40);
  await expect(page.getByRole('button', { name: 'Tout effacer', exact: true })).toBeHidden();
  if (await compact(page)) {
    await page.getByRole('button', { name: /^Filtres/ }).click();
    await expect(page.getByRole('combobox', { name: 'Playlist', exact: true })).toHaveValue('');
    await page.getByRole('button', { name: /^Voir 50 vidéos/ }).click();
  } else {
    await expect(page.getByRole('button', { name: 'Toutes les playlists', exact: true })).toBeVisible();
  }
  const search = page.getByRole('textbox', { name: 'Rechercher des vidéos' });
  for (const query of ['Eric', 'Éric']) {
    await search.fill(query);
    await search.press('Enter');
    await expectCount(page, 2);
  }
  await search.fill('<>&" introuvable');
  await search.press('Enter');
  await expectCount(page, 0);
  await expect(page.getByRole('button', { name: 'Choisir une vidéo', exact: true })).toBeDisabled();
  await expect(page.getByText('Aucune vidéo ne correspond à votre recherche ou aux filtres sélectionnés.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tout effacer', exact: true }).click();
  await expectCount(page, 50);
});

test('filtres combinés, lien direct et rechargement', async ({ page }) => {
  await selectCategory(page, 'Tech');
  await expectCount(page, 2);
  if (await compact(page)) {
    await page.getByRole('combobox', { name: 'Durée', exact: true }).selectOption({ label: '10-20 min' });
    await page.getByRole('button', { name: /^Filtres/ }).click();
    await page.getByRole('combobox', { name: 'Playlist', exact: true }).selectOption(primary);
    await page.getByRole('button', { name: /^Voir 1 vidéo/ }).click();
  } else {
    await page.getByRole('button', { name: /^10-20 min / }).click();
    await page.getByRole('button', { name: 'Toutes les playlists', exact: true }).click();
    await page.getByRole('button', { name: 'Playlist principale', exact: true }).click();
  }
  await expectCount(page, 1);
  await page.reload();
  await expectCount(page, 1);
  await expect(cards(page).getByRole('link')).toHaveAttribute('href', /qa000000002$/);
  await page.getByRole('button', { name: /^Supprimer le filtre Playlist/ }).click();
  await expectCount(page, 2);
  await page.getByRole('button', { name: 'Tout effacer', exact: true }).click();
  await expectCount(page, 50);
});

test('tirage filtré, changement, fermeture et focus visible dans les deux thèmes', async ({ page }, testInfo) => {
  await selectCategory(page, 'Tech');
  const trigger = page.getByRole('button', { name: 'Choisir une vidéo', exact: true });
  for (const theme of ['Clair', 'Sombre']) {
    await page.getByRole('combobox', { name: 'Thème', exact: true }).selectOption({ label: theme });
    await page.keyboard.press('Tab');
    const submit = page.getByRole('button', { name: 'Rechercher', exact: true });
    await submit.focus();
    await expect(submit).toHaveCSS('outline-style', 'solid');
    await expect(submit).toHaveCSS('outline-color', theme === 'Clair' ? 'rgb(176, 0, 0)' : 'rgb(255, 133, 133)');
    await trigger.focus();
    await trigger.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Le choix du hasard' });
    await expect(dialog).toBeVisible();
    const link = dialog.getByRole('link', { name: 'Ouvrir sur YouTube', exact: true });
    await expect(link).toHaveAttribute('href', /qa00000000[23]$/);
    await expectInViewport(page, link);
    await expectInViewport(page, dialog.getByRole('button', { name: 'Autre choix' }));
    const first = await link.getAttribute('href');
    await dialog.getByRole('button', { name: 'Autre choix' }).click();
    await expect(link).not.toHaveAttribute('href', first!);
    await expectInViewport(page, link);
    await expectInViewport(page, dialog.getByRole('button', { name: 'Autre choix' }));
    expect(page.context().pages()).toHaveLength(1);
    await page.screenshot({ path: testInfo.outputPath(`dialog-${theme}.png`) });
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    const style = await trigger.evaluate(element => ({
      visible: element.matches(':focus-visible'),
      outlineStyle: getComputedStyle(element).outlineStyle,
      outlineWidth: getComputedStyle(element).outlineWidth,
    }));
    expect(style.visible).toBe(true);
    expect(style.outlineStyle).toBe('solid');
    expect(style.outlineWidth).toBe('2px');
    await expect(trigger).toHaveCSS('outline-color', theme === 'Clair' ? 'rgb(176, 0, 0)' : 'rgb(255, 133, 133)');
  }
});

test('premier contenu visible et adaptation à une faible hauteur', async ({ page }, testInfo) => {
  const first = await cards(page).first().boundingBox();
  expect(first!.y).toBeLessThan(page.viewportSize()!.height - 40);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('catalogue.png') });
  await page.setViewportSize({ width: 1280, height: 390 });
  await expect(page.getByRole('button', { name: /^Filtres/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ordre de la playlist', exact: true })).toBeHidden();
  const shortFirst = await cards(page).first().boundingBox();
  expect(shortFirst!.y).toBeLessThan(350);
  await page.getByRole('button', { name: /^Filtres/ }).click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByRole('region', { name: 'Filtres des vidéos', exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Ordre de la playlist', exact: true })).toBeVisible();
});

test('chargement de la suite sans doublons et reprise après rechargement', async ({ page }) => {
  await page.getByRole('button', { name: 'Afficher 10 vidéos supplémentaires', exact: true }).press('Enter');
  await expect(cards(page)).toHaveCount(50);
  await expect(cards(page).nth(40).getByRole('link')).toBeFocused();
  const urls = await cards(page).getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href')));
  expect(new Set(urls).size).toBe(50);
  await page.reload();
  await expect(cards(page)).toHaveCount(50);
});

test('une panne d’actualisation conserve les vidéos et permet de réessayer', async ({ page }) => {
  const fail = async (route: Route) => route.abort('failed');
  await page.route('**/data/videos.json', fail);
  await page.getByRole('button', { name: 'Actualiser', exact: true }).click();
  await expect(page.getByText('Actualisation impossible. La dernière bibliothèque chargée reste disponible.', { exact: true })).toBeVisible();
  await expectCount(page, 50);
  await expect(cards(page)).toHaveCount(40);
  await page.unroute('**/data/videos.json', fail);
  await page.getByRole('button', { name: 'Actualiser', exact: true }).click();
  await expect(page.getByText('Actualisation impossible. La dernière bibliothèque chargée reste disponible.', { exact: true })).toBeHidden();
  await expectCount(page, 50);
});

async function loadVariant(page: Page, edit: (videos: typeof rows) => void) {
  const videos = rows.map(row => [...row]);
  edit(videos);
  await page.route('**/data/videos.json', route => route.fulfill({ json: {
    schemaVersion: 1, videos: [columns, ...videos, [...videos[0].slice(0, 15), secondary, '']],
  } }));
  await page.reload();
  await expectCount(page, 50);
}

async function selectCollection(page: Page, label: string) {
  if (await compact(page)) {
    await page.getByRole('button', { name: /^Filtres/ }).click();
    await page.getByRole('combobox', { name: 'Collection', exact: true }).selectOption({ label });
    await page.getByRole('button', { name: /^Voir \d+ vidéo/ }).click();
  } else {
    await page.getByRole('button', { name: 'Toutes les collections', exact: true }).click();
    await page.getByRole('button', { name: label, exact: true }).click();
  }
}

test('la recherche distingue IA des fragments et privilégie les correspondances exactes', async ({ page }) => {
  await loadVariant(page, videos => {
    ['L’IA au quotidien', "L'I.A transforme le travail", 'Sebastian Marx', 'Salaire médian', 'Un sujet chiant',
      'Défigure', 'Figure et forme', 'Figure'].forEach((title, i) => { videos[i + 10][1] = title; });
    videos[15][4] = '2026-12-01T12:00:00Z';
    videos[17][4] = '2025-01-01T12:00:00Z';
  });
  const search = page.getByRole('textbox', { name: 'Rechercher des vidéos' });
  await search.fill('IA');
  await expectCount(page, 2);
  await expect(cards(page).getByRole('heading')).toHaveText(['L’IA au quotidien', "L'I.A transforme le travail"]);
  await search.fill('figure');
  await expectCount(page, 3);
  await expect(cards(page).getByRole('heading')).toHaveText(['Figure', 'Figure et forme', 'Défigure']);
  if (await compact(page)) {
    await page.getByRole('button', { name: /^Filtres/ }).click();
    await page.getByRole('combobox', { name: 'Trier par', exact: true }).selectOption({ label: 'Publication : plus récentes' });
    await page.getByRole('button', { name: 'Voir 3 vidéos', exact: true }).click();
  } else {
    await page.getByRole('button', { name: 'Pertinence', exact: true }).click();
    await page.getByRole('button', { name: 'Publication : plus récentes', exact: true }).click();
  }
  await expect(cards(page).getByRole('heading')).toHaveText(['Défigure', 'Figure et forme', 'Figure']);
  await search.fill('Ér');
  await expectCount(page, 2);
});

test('un thème se combine aux collections et les anciens liens restent utilisables', async ({ page }) => {
  await loadVariant(page, videos => {
    for (const i of [10, 11]) {
      videos[i][3] = 'Marques Brownlee';
      videos[i][13] = 'Youtuber pref';
      videos[i][16] = 'UCBJycsmduvYEL83R_U4JriQ';
    }
    videos[10][1] = 'Google Pixel — test synthétique';
    videos[11][1] = 'Clip musical synthétique';
    videos[11][11] = '10';
  });
  await selectCategory(page, 'Tech');
  await expectCount(page, 3);
  await selectCollection(page, 'Créateurs favoris');
  await expectCount(page, 1);
  await expect(cards(page).getByRole('heading')).toHaveText('Google Pixel — test synthétique');
  await page.reload();
  await expectCount(page, 1);
  await page.getByRole('button', { name: /^Supprimer le filtre Thème/ }).click();
  await expectCount(page, 2);
  await page.goto('./?category=Youtuber+pref');
  await expectCount(page, 2);
  await expect(page).toHaveURL(/collection=Youtuber\+pref/);
  await expect(page).not.toHaveURL(/[?&]category=/);
});

test('une durée maximale réunit les plages, survit au rechargement et borne le tirage', async ({ page }) => {
  await loadVariant(page, videos => {
    ['00:19:59', '00:20:00', '00:20:01', 'Inconnue'].forEach((duration, i) => { videos[i + 10][5] = duration; });
  });
  await page.getByRole('combobox', { name: await compact(page) ? 'Durée' : 'Durée maximale', exact: true })
    .selectOption({ label: 'Moins de 20 min' });
  await expectCount(page, 47);
  await expect(page).toHaveURL(/maxDuration=20/);
  await page.reload();
  await expectCount(page, 47);
  await page.getByRole('button', { name: 'Afficher 7 vidéos supplémentaires', exact: true }).click();
  await expect(cards(page)).toHaveCount(47);
  const urls = await cards(page).getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href')));
  expect(new Set(urls).size).toBe(47);
  for (const i of [11, 12, 13]) expect(urls).not.toContain(`https://www.youtube.com/watch?v=qa${String(i).padStart(9, '0')}`);
  await page.getByRole('button', { name: 'Choisir une vidéo', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Le choix du hasard' });
  for (let i = 0; i < 3; i++) {
    expect(urls).toContain(await dialog.getByRole('link', { name: 'Ouvrir sur YouTube', exact: true }).getAttribute('href'));
    await dialog.getByRole('button', { name: 'Autre choix', exact: true }).click();
  }
  await page.keyboard.press('Escape');
});

test('le tri ne compte pas comme filtre et reste choisi après effacement', async ({ page }) => {
  if (await compact(page)) {
    await page.getByRole('button', { name: /^Filtres/ }).click();
    await page.getByRole('combobox', { name: 'Trier par', exact: true }).selectOption({ label: 'Publication : plus récentes' });
    await page.getByRole('button', { name: 'Voir 50 vidéos', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Filtres', exact: true })).toBeVisible();
  } else {
    await page.getByRole('button', { name: 'Ordre de la playlist', exact: true }).click();
    await page.getByRole('button', { name: 'Publication : plus récentes', exact: true }).click();
  }
  await expectCount(page, 50);
  await expect(page.getByRole('button', { name: 'Tout effacer', exact: true })).toBeHidden();
  await page.getByRole('textbox', { name: 'Rechercher des vidéos' }).fill('Eric');
  await expectCount(page, 2);
  await page.getByRole('button', { name: 'Tout effacer', exact: true }).click();
  await expectCount(page, 50);
  await expect(page).toHaveURL(/sort=newest/);
  await expect(page.getByRole('button', { name: 'Tout effacer', exact: true })).toBeHidden();
  await page.reload();
  await expect(page).toHaveURL(/sort=newest/);
});

test('recherche et filtres restent accessibles en défilant, sans perdre la position à la fermeture', async ({ page }, testInfo) => {
  await page.mouse.wheel(0, 1400);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(800);
  const search = page.getByRole('textbox', { name: 'Rechercher des vidéos' });
  await expectInViewport(page, search);
  const before = await page.evaluate(() => window.scrollY);
  if (await compact(page)) {
    const trigger = page.getByRole('button', { name: 'Filtres', exact: true });
    await expectInViewport(page, trigger);
    await trigger.click();
    await expect(page.getByRole('region', { name: 'Filtres des vidéos', exact: true })).toBeVisible();
    await trigger.press('Escape');
    await expect(page.getByRole('region', { name: 'Filtres des vidéos', exact: true })).toBeHidden();
  } else {
    const trigger = page.getByRole('button', { name: 'Tous les thèmes', exact: true });
    await expectInViewport(page, trigger);
    await trigger.click();
    await page.keyboard.press('Escape');
  }
  await expectInViewport(page, page.getByRole('button', { name: 'Retour en haut', exact: true }));
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - before)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('commandes-pendant-defilement.png') });
  await page.getByRole('button', { name: 'Retour en haut', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.getByRole('button', { name: 'Revenir en haut de la page', exact: true })).toBeFocused();
  await page.mouse.wheel(0, 1400);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(800);
  await search.fill('Eric');
  await expectCount(page, 2);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(before);
  const first = await cards(page).first().boundingBox();
  expect(first!.y).toBeGreaterThanOrEqual(0);
  expect(first!.y).toBeLessThan(page.viewportSize()!.height - 40);
});
