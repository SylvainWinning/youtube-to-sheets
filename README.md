# youtube-to-sheets

Synchronisation des vidéos d’une playlist YouTube vers Google Sheets.

Les vidéos sont réparties dans des onglets selon leur durée et un onglet
supplémentaire **AllVideos** regroupe l'intégralité des entrées.

## Planification

Synchronisation automatique aux heures suivantes (heure de Paris) :
- 00 h
- 01 h
- 02 h
- 12 h
- 13 h
- 14 h
- 20 h
- 21 h
- 22 h
- 23 h

Le fichier `.github/workflows/sync.yml` convertit ces heures en UTC suivant la saison :
- CEST (heure d’été, UTC+2) pour avril à septembre, 1–24 octobre, 25–31 mars.
- CET (heure d’hiver, UTC+1) pour novembre à février, 1–24 mars, 25–31 octobre.

Aucune exécution n’est programmée en dehors de ces créneaux.  
Tu peux toujours déclencher manuellement via l’onglet **Actions**.

## Configuration

Secrets GitHub à créer :
- `YOUTUBE_API_KEY`
- `SPREADSHEET_ID` — identifiant **ou URL complète** de la feuille Google Sheets
  (une suite de 25 à 60 caractères alphanumériques, tirets ou soulignés)
- `SERVICE_ACCOUNT_JSON` contenu JSON du compte de service Google

Partage la feuille Google Sheets avec l’e‑mail du compte de service.
Le script lit directement `SERVICE_ACCOUNT_JSON` depuis l’environnement : aucun fichier local n’est requis.

Exécute la synchronisation avec :
```bash
python main.py PLAYLIST_ID [--sheet-tab-name NOM_ONGLET]
```

L’interface web `bolt-app` lit uniquement le catalogue public
`public/data/videos.json`. Elle ne demande aucune clé Google ni identifiant
Sheets. La synchronisation et l’export restent dans les workflows CI ou les
scripts Python locaux; leurs secrets ne sont pas transmis au build Pages.

Vite n’expose aucune variable d’environnement personnalisée, y compris celles
préfixées `VITE_`. Seules ses constantes intégrées, dont `BASE_URL`, restent
utilisées. Les paramètres `?spreadsheetId=` et `?apiKey=` ne configurent pas le site.
Ne place pas de secrets dans l’URL, les fichiers du dossier `public` ou les données exportées.

### Démarrer l’interface web

Node.js 24 est utilisé pour le développement, les tests et le build Pages
(`bolt-app/.nvmrc`).

Installation :
```bash
cd bolt-app && npm ci
```

Mode développement :
```bash
npm run dev
```

Production :
```bash
npm run build
```

Le front-end utilise ce JSON en développement comme en production.
L’actualisation relit l’instantané publié; elle ne lance pas la synchronisation Sheets.

## Export des données

Pour générer un instantané local des vidéos présentes dans la feuille Google :
```bash
SPREADSHEET_ID="..." YOUTUBE_API_KEY="..." python export_data.py
```
Cette commande lit la feuille via l’API publique et crée `data/videos.json`. Le
script `main.py` met automatiquement ce fichier à jour après chaque
**synchronisation** d’une playlist.

Pour exporter les données vers des fichiers consommés par l’application web :
```bash
SPREADSHEET_ID="..." SERVICE_ACCOUNT_JSON='{"...": ...}' \
python scripts/export_sheet.py --sheet-range "AllVideos!A1:Z"
```
La commande écrit `bolt-app/public/data/videos.csv` et
`bolt-app/public/data/videos.json`. L’option `--sheet-range` accepte une liste
de plages séparées par des virgules ou un tableau JSON (`['Tab1!A1:Z',
'Tab2!A1:Z']`).

## Dépendances

Voir `requirements.txt`.

Installation locale :
```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## Tests

### Python

```bash
python -m pytest
```

### bolt-app

Utiliser Node.js 24 pour le lanceur de tests TypeScript.

```bash
cd bolt-app
npm ci
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:ui
```

Le lint couvre les fichiers JavaScript, TypeScript et TSX et les règles Hooks.
Un contrôle avec des fixtures volontairement invalides en mémoire vérifie que
les extensions TypeScript et les Hooks ne sont pas silencieusement ignorés.

Les 44 parcours UI utilisent un catalogue synthétique intercepté dans le navigateur,
sans charger la bibliothèque personnelle ni ouvrir YouTube. Ils couvrent ordinateur,
petit mobile, tablette et paysage : recherche, filtres, tirage, focus clair/sombre,
chargement par lots, reprise et panne réseau. Ils vérifient aussi les sigles courts,
la pertinence, thème + collection, les anciens liens, la durée maximale et ses bornes,
le tri après effacement et la position de lecture avec les commandes fixes. Les captures sont enregistrées dans
`bolt-app/test-results/` et jointes aux exécutions CI ; les assertions portent sur les
parcours, le focus et la géométrie, pas sur une comparaison pixel par pixel.

Ces tests n'exigent pas de secrets : les appels réseau sont simulés.
Les tests de dates figent l'horloge et respectent les heures UTC des données,
tout en conservant les dates sans heure dans le calendrier local.
La CI utilise l’image officielle Playwright 1.64.1 Noble, avec navigateurs et
bibliothèques Linux préinstallés, épinglée par empreinte. Mettre à jour cette image
avec la version Playwright du lockfile. Elle évite une installation via les miroirs
Ubuntu à chaque exécution. Les tests UI ont une limite globale de cinq minutes,
avec un délai de job supérieur permettant de conserver le rapport en cas d’échec.

Le workflow réutilisable `Validate frontend artifact` vérifie les dépendances, le lint,
les tests dans quatre fuseaux (UTC, Europe/Paris, America/Los_Angeles, Asia/Tokyo),
le typage, la compilation et les parcours UI sur ce build. Il est appelé par les
contrôles de PR et par la publication. La publication résout une seule révision,
la valide, puis déploie uniquement son artefact nommé par ce commit ; aucun nouveau
build n’est fait après les tests. Un échec bloque l’envoi de l’artefact et le job de
publication. Après une synchronisation qui a committé de nouvelles données, `main`
est résolu une fois avant cette validation. Les reprises Pages réutilisent le même
artefact validé. `npm run build` vérifie le typage avant de compiler avec Vite.

## Dépendances de l’interface

Les bibliothèques Google Node ne sont pas nécessaires au navigateur. Les mises à
jour compatibles, la migration Vite 8 et la migration Tailwind 4 sont validées
séparément. `npm run audit` vérifie les dépendances de production et de build;
ce contrôle est également exécuté en CI. Une nouvelle alerte fait échouer ce contrôle.

Tailwind 4 cible Safari 16.4+, Chrome 111+ et Firefox 128+. Les navigateurs plus
anciens ne sont plus couverts par cette version du moteur CSS.
# Bibliothèque et playlists

Le JSON publié conserve une ligne par appartenance à une playlist. L’interface regroupe ces lignes par identifiant vidéo YouTube (les liens non ouvrables sont écartés et signalés) dans une bibliothèque de vidéos uniques. La première fiche fournit les métadonnées; toutes les appartenances et leurs positions sont conservées séparément, y compris les répétitions dans une même playlist.

« Toutes les playlists », les compteurs de durée et le tirage aléatoire utilisent des vidéos distinctes. Une vidéo partagée porte la mention « 2 playlists ». Dans une playlist sélectionnée, le tri « Ordre de la playlist » utilise sa position propre; en cas de répétition, la première position est retenue pour l’affichage unique. Les données sources ne sont pas supprimées ni réécrites par ce regroupement.

« Choisir une vidéo » tire au sort parmi les résultats des filtres actifs, puis présente un aperçu. Seul le lien « Ouvrir sur YouTube » ouvre un nouvel onglet; « Autre choix » évite la proposition précédente lorsqu’une alternative existe.


### Fraîcheur et exhaustivité de la bibliothèque

Le JSON publié contient `schemaVersion: 1`, `videos` (en-têtes et lignes) et
`metadata`. Les anciennes copies sous forme de tableau restent lisibles, mais
leur exhaustivité et leur date de synchronisation sont affichées comme inconnues.
`lastSuccessfulSync` avance uniquement après récupération complète de toutes les
playlists et des détails vidéo, puis écriture réussie dans Google Sheets.
`lastAttempt` décrit la tentative ; `publishedAt` décrit la publication de la copie.
Le chargement du navigateur n'est jamais présenté comme une synchronisation YouTube.

`status` vaut `complete`, `degraded` ou `unknown` ; `source` vaut `youtube`,
`mixed`, `cache` ou `sheets`. Le nombre de vidéos est dédupliqué, tandis que
`rowCount` conserve les appartenances aux playlists. Un export Sheets ne reprend
la provenance vérifiée que si son empreinte correspond aux données synchronisées.
Les données sans preuve de synchronisation sont signalées comme non vérifiées.

Avant de modifier les onglets ou de publier un export, toute copie vide ou baisse
supérieure à 20 % du total ou d'une playlist est refusée. La limite est configurable
avec `MAX_VIDEO_DROP_RATIO` (valeur entre 0 inclus et 1 exclu) pour une suppression
volontaire vérifiée. Un échec de synchronisation conserve les vidéos précédentes,
publie leur état dégradé et laisse le workflow en échec. Le déploiement peut ainsi
mettre à jour l'information de panne sans publier une bibliothèque amputée.

### Libellés et présentation

Le nom affiché est « Mes vidéos YouTube ». Sans recherche, le tri par défaut est
« Ordre de la playlist ». Avec une recherche, « Pertinence » privilégie les champs
et mots complets, puis les préfixes et fragments ; un tri de publication explicite
reste prioritaire. Les accents, apostrophes et ligatures restent normalisés. Les
sigles courts IA, AI, UI, UX, VR et AR exigent un mot complet ; les initiales pointées
comme I.A et les apostrophes comme l’IA sont reconnues. Les autres termes d’une ou
deux lettres peuvent être des préfixes, pour conserver la saisie progressive des noms.
La recherche reste textuelle et n’analyse pas le sujet réel des vidéos.

Les thèmes et les collections sont indépendants. Les appartenances historiques à
« Pause dej » et « Youtuber pref » sont conservées et affichées comme « Pause déjeuner »
et « Créateurs favoris ». Elles se combinent avec un thème, une playlist et une durée.
La colonne personnelle `myCategory` et les données publiées restent intactes.
À l’entrée de la bibliothèque, les thèmes et collections sont calculés sans mutation.
Un thème personnel explicite prime. Sinon, les exceptions de `topicRules.json`
(vidéo puis identifiant stable de chaîne) priment sur le classement existant ;
pour une ancienne collection, la catégorie YouTube de chaque vidéo fournit le thème
par défaut. Sans correspondance, « Non classées » reste visible. La table de
correspondance est une règle éditoriale large, pas une analyse sémantique garantie.
Modifier ses entrées `videos`, `channels` ou `youtubeCategories` permet des ajustements
sans renommer une chaîne ; une règle vidéo accepte plusieurs thèmes.

Les anciens liens `category=Youtuber+pref` ou `category=Pause+dej` migrent vers
`collection=…`. Les thèmes continuent d’utiliser `category=…`. Les paramètres tiers
et l’ancre sont conservés. Les compteurs et le tirage utilisent toujours les vidéos
uniques ; le regroupement conserve aussi l’union des thèmes/collections des occurrences.

« Moins de 20 min » et les autres durées maximales incluent toutes les vidéos
strictement plus courtes, sans durée inconnue. Les tranches historiques restent
accessibles. Le paramètre partagé `maxDuration=20` remplace `duration` lorsque cette
limite est active ; le tirage porte sur le même ensemble que les résultats.

Le nombre de filtres exclut le tri, qui ne réduit pas les résultats. « Tout effacer »
retire les restrictions et conserve le tri choisi. La recherche et les filtres restent
accessibles pendant le défilement, avec un retour en haut explicite. Ouvrir/fermer un
panneau sans changement conserve la position ; changer un critère replace le début
des résultats dans la zone de lecture. Le clic générique dans le coin supérieur
gauche d’iOS n’est plus intercepté : cette zone accueille maintenant la recherche.
L’événement natif `statusTap` et les boutons explicites restent pris en charge.

Les actions secondaires restent sobres, l’action principale ressort en rouge et la
sélection associe fond teinté, contour et texte renforcé.

### Validation du chargement

Les imports local et Sheets utilisent le même validateur et le même transformateur, avec des entrées `unknown` contrôlées à l’exécution. Le lecteur accepte la version explicite 1 (colonnes contrôlées), les anciens tableaux et les enveloppes sans version. Une autre version explicite ou une réponse HTTP/Sheets mal formée est refusée. Les lignes sans titre ou lien YouTube ouvrable sont signalées ; elles ne peuvent pas prouver une synchronisation complète.

Les formats de dates historiques sont conservés, avec contrôle du calendrier : une date impossible ou absente reste inconnue et n’est jamais remplacée par aujourd’hui. Les images ne conditionnent pas la validité d’une vidéo : URL d’avatar malformée, miniature manquante ou erreur de chargement affichent un repli, avec les dimensions réservées conservées. La synchronisation privée reste hors du code chargé par le navigateur.
