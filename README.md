# youtube-to-sheets

Script Python pour synchroniser les vidéos d’une playlist YouTube vers Google Sheets.

## Planification automatique

La synchronisation est lancée automatiquement aux heures suivantes (heure de Paris):
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

Le workflow est dans `.github/workflows/sync.yml`. Il déclenche toutes les heures en UTC et un job de garde n’autorise l’exécution que si l’heure locale Europe/Paris fait partie de la liste ci‑dessus. Ça fonctionne correctement toute l’année, y compris avec l’heure d’été.

Tu peux aussi lancer manuellement depuis l’onglet Actions avec le bouton Run workflow.

## Configuration

Secrets GitHub à créer dans Settings → Secrets and variables → Actions:
- `YOUTUBE_API_KEY` clé YouTube Data API v3
- `SPREADSHEET_ID` ID de la feuille Google
- `SERVICE_ACCOUNT_JSON` contenu JSON de la clé de compte de service Google

Partage la Google Sheet avec l’adresse e‑mail du compte de service pour donner l’accès.

## Dépendances

Voir `requirements.txt`. Installation locale:
```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
