import os
import requests
from datetime import datetime
from google.oauth2 import service_account
from googleapiclient.discovery import build

# Récupérer les variables d'environnement
YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")
SPREADSHEET_ID = os.environ.get("SPREADSHEET_ID")

# Charger les credentials du compte de service Google Sheets
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
SERVICE_ACCOUNT_FILE = 'service_account.json'  # Le workflow recrée ce fichier à chaque run
creds = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
service = build('sheets', 'v4', credentials=creds)

# Identifiant de la playlist YouTube
PLAYLIST_ID = "PLtBV_WamBQbB0-VXbM0H-uKd7O24uCjmY"

# URL de l'API YouTube Data pour récupérer les vidéos de la playlist
YT_API_URL = (
    f"https://www.googleapis.com/youtube/v3/playlistItems"
    f"?part=snippet%2CcontentDetails&playlistId={PLAYLIST_ID}&maxResults=50&key={YOUTUBE_API_KEY}"
)

# Appeler l'API YouTube
response = requests.get(YT_API_URL)
data = response.json()

# Extraire les infos des vidéos
videos = []
for item in data.get('items', []):
    title = item['snippet']['title']
    video_id = item['contentDetails']['videoId']
    channel = item['snippet']['channelTitle']
    # Date d'ajout à la playlist
    published_at = item['snippet']['publishedAt']

    # Convertir la date ISO8601 en format plus lisible
    dt = datetime.strptime(published_at, "%Y-%m-%dT%H:%M:%SZ")
    published_at_formatted = dt.strftime("%d/%m/%Y %H:%M:%S")

    video_link = f"https://www.youtube.com/watch?v={video_id}"

    # Ajouter la ligne à la liste des vidéos
    videos.append([title, video_link, channel, published_at_formatted])

# Définir la plage dans la feuille où écrire les données
# Assure-toi que le nom de ta feuille correspond : si ta feuille s'appelle "Feuille 1",
# utilise "'Feuille 1'!A2:D". Si c'est "Feuille1" sans espace, "Feuille1!A2:D" suffit.
RANGE_NAME = "'Feuille 1'!A2:D"

# Préparer le corps de la requête pour la mise à jour
body = {
    'values': videos
}

# Mettre à jour le Google Sheet
result = service.spreadsheets().values().update(
    spreadsheetId=SPREADSHEET_ID,
    range=RANGE_NAME,
    valueInputOption='RAW',
    body=body
).execute()

print(f"{result.get('updatedCells')} cellules mises à jour.")
