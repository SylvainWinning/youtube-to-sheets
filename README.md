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

Variables d’environnement **obligatoires** pour l’application web `bolt-app` :
- `SPREADSHEET_ID` — identifiant **ou URL complète** de la feuille Google Sheets
  (25 à 60 caractères alphanumériques, tirets ou soulignés)
- `YOUTUBE_API_KEY` — clé API Google

Créer un fichier `.env` dans le dossier `bolt-app` avec ces entrées (un modèle
est fourni dans `.env.example`). L’application échouera au démarrage si l’une de
ces variables est absente.

Le fichier de configuration Vite expose automatiquement ces variables au
code client : aucun préfixe `VITE_` n’est nécessaire.

Pour des tests rapides, ces valeurs peuvent aussi être fournies via l’URL :
`?spreadsheetId=` et `?apiKey=`.

### Démarrer l’interface web

Installation :
```bash
cd bolt-app && npm install
```

Mode développement :
```bash
npm run dev
```

Production :
```bash
npm run build
```

Sans variables d’environnement, le front-end lit `public/data/videos.json`.

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

```bash
cd bolt-app && npm test
cd bolt-app && npm run lint
```
Ces tests n'exigent pas de secrets : les appels réseau sont simulés.
