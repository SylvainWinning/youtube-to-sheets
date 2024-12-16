import os
import requests
import re
from datetime import datetime
from google.oauth2 import service_account
from googleapiclient.discovery import build

def parse_duration(iso_duration):
    # Exemple de iso_duration : "PT4M13S"
    # On va extraire les heures (H), minutes (M), et secondes (S)
    pattern = re.compile(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?')
    match = pattern.match(iso_duration)
    hours = int(match.group(1)) if match.group(1) else 0
    minutes = int(match.group(2)) if match.group(2) else 0
    seconds = int(match.group(3)) if match.group(3) else 0

    # Formater la durée en HH:MM:SS si heures présentes, sinon MM:SS
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    else:
        return f"{minutes:02d}:{seconds:02d}"


YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")
SPREADSHEET_ID = os.environ.get("SPREADSHEET_ID")

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
SERVICE_ACCOUNT_FILE = 'service_account.json'
creds = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
service = build('sheets', 'v4', credentials=creds)

PLAYLIST_ID = "PLtBV_WamBQbB0-VXbM0H-uKd7O24uCjmY"
YT_PLAYLIST_API_URL = (
    f"https://www.googleapis.com/youtube/v3/playlistItems"
    f"?part=snippet%2CcontentDetails&playlistId={PLAYLIST_ID}&maxResults=50&key={YOUTUBE_API_KEY}"
)

response = requests.get(YT_PLAYLIST_API_URL)
data = response.json()

videos = []
for item in data.get('items', []):
    title = item['snippet']['title']
    video_id = item['contentDetails']['videoId']
    published_at = item['snippet']['publishedAt']

    dt = datetime.strptime(published_at, "%Y-%m-%dT%H:%M:%SZ")
    published_at_formatted = dt.strftime("%d/%m/%Y %H:%M:%S")

    video_link = f"https://www.youtube.com/watch?v={video_id}"

    # Nouvel appel pour récupérer les infos de la vidéo (snippet+contentDetails)
    YT_VIDEO_API_URL = (
        f"https://www.googleapis.com/youtube/v3/videos"
        f"?part=snippet,contentDetails&id={video_id}&key={YOUTUBE_API_KEY}"
    )
    video_response = requests.get(YT_VIDEO_API_URL)
    video_data = video_response.json()

    if 'items' in video_data and len(video_data['items']) > 0:
        channel = video_data['items'][0]['snippet']['channelTitle']
        duration_iso = video_data['items'][0]['contentDetails']['duration']
        video_duration = parse_duration(duration_iso)
    else:
        channel = "Inconnu"
        video_duration = "Inconnue"

    # On ajoute maintenant la durée en plus, donc 5 colonnes :
    # Titre (A), Lien (B), Chaine (C), Date (D), Durée (E)
    videos.append([title, video_link, channel, published_at_formatted, video_duration])

# Maintenant, la plage va jusqu'à la colonne E
RANGE_NAME = "'Feuille 1'!A2:E"
body = {
    'values': videos
}

# Mise à jour des données dans le Google Sheet
result = service.spreadsheets().values().update(
    spreadsheetId=SPREADSHEET_ID,
    range=RANGE_NAME,
    valueInputOption='RAW',
    body=body
).execute()

print(f"{result.get('updatedCells')} cellules mises à jour.")

# Ajout des bordures autour du tableau
num_rows = len(videos)
requests = [
    {
        "updateBorders": {
            "range": {
                "sheetId": 0,  # L'ID de l'onglet (en général 0 pour la première feuille)
                "startRowIndex": 1,       # A partir de la ligne 2 (index 1)
                "endRowIndex": 1 + num_rows,
                "startColumnIndex": 0,    # A=0
                "endColumnIndex": 5       # On avait A-D = 4, maintenant A-E = 5
            },
            "top": {
                "style": "SOLID",
                "width": 1,
                "color": {"red": 0, "green": 0, "blue": 0}
            },
            "bottom": {
                "style": "SOLID",
                "width": 1,
                "color": {"red": 0, "green": 0, "blue": 0}
            },
            "left": {
                "style": "SOLID",
                "width": 1,
                "color": {"red": 0, "green": 0, "blue": 0}
            },
            "right": {
                "style": "SOLID",
                "width": 1,
                "color": {"red": 0, "green": 0, "blue": 0}
            },
            "innerHorizontal": {
                "style": "SOLID",
                "width": 1,
                "color": {"red": 0, "green": 0, "blue": 0}
            },
            "innerVertical": {
                "style": "SOLID",
                "width": 1,
                "color": {"red": 0, "green": 0, "blue": 0}
            }
        }
    }
]

format_body = {
    "requests": requests
}

response = service.spreadsheets().batchUpdate(
    spreadsheetId=SPREADSHEET_ID,
    body=format_body
).execute()

print("Bordures ajoutées aux cellules.")
