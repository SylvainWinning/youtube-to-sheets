import os
import requests
from datetime import datetime
from google.oauth2 import service_account
from googleapiclient.discovery import build

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

    # Nouvel appel pour récupérer les infos de la vidéo (pour le channel)
    YT_VIDEO_API_URL = (
        f"https://www.googleapis.com/youtube/v3/videos"
        f"?part=snippet&id={video_id}&key={YOUTUBE_API_KEY}"
    )
    video_response = requests.get(YT_VIDEO_API_URL)
    video_data = video_response.json()

    if 'items' in video_data and len(video_data['items']) > 0:
        channel = video_data['items'][0]['snippet']['channelTitle']
    else:
        channel = "Inconnu"

    videos.append([title, video_link, channel, published_at_formatted])

RANGE_NAME = "'Feuille 1'!A2:D"
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
                "sheetId": 0,  # ID de la feuille (en général 0 pour la première)
                "startRowIndex": 1,  # La ligne 2 (A2) correspond à l'index 1 (ligne 1 = A1)
                "endRowIndex": 1 + num_rows,
                "startColumnIndex": 0, # Colonne A = index 0
                "endColumnIndex": 4    # A=0, B=1, C=2, D=3, endColumnIndex = 4 car non inclusif
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
