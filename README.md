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

Variables d’environnement supplémentaires :
- `PLAYLIST_ID` — identifiant **ou URL complète** de la playlist YouTube à synchroniser (peut être défini comme variable GitHub non secrète)

Partage la feuille Google Sheets avec l’e‑mail du compte de service.
Le script lit directement `SERVICE_ACCOUNT_JSON` depuis l’environnement : aucun fichier local n’est requis.

Variables d’environnement **obligatoires** pour l’application web `bolt-app` :
- `VITE_SPREADSHEET_ID` — identifiant **ou URL complète** de la feuille Google Sheets
  (25 à 60 caractères alphanumériques, tirets ou soulignés)
- `VITE_YOUTUBE_API_KEY` — clé API Google exposée côté client

Créer un fichier `.env` dans le dossier `bolt-app` avec ces entrées (un modèle
est fourni dans `.env.example`). L’application échouera au démarrage si l’une de
ces variables est absente.

Seules les variables préfixées par `VITE_` sont exposées côté client ; des noms
comme `SPREADSHEET_ID` ou `API_KEY` ne seront pas accessibles.

Pour des tests rapides, ces valeurs peuvent aussi être fournies via l’URL :
`?spreadsheetId=` et `?apiKey=`.

## Dépendances

Voir `requirements.txt`.

Installation locale :
```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```
