import os
import requests
from google.oauth2 import service_account
from googleapiclient.discovery import build

YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")
SPREADSHEET_ID = os.environ.get("SPREADSHEET_ID")

# Charger les credentials du service account
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
creds = service_account.Credentials.from_service_account_file('service_account.json', scopes=SCOPES)
service = build('sheets', 'v4', credentials=creds)

# Récupérer les données YouTube
PLAYLIST_ID = "PLtBV_WamBQbB0-VXbM0H-uKd7O24uCjmY"
YT_API_URL = f"https://www.googleapis.com/youtube/v3/playlistItems?part=snippet%2CcontentDetails&playlistId={PLAYLIST_ID}&maxResults=50&key={YOUTUBE_API_KEY}"

response = requests.get(YT_API_URL)
data = response.json()

videos = []
for item in data.get('items', []):
    title = item['snippet']['title']
    video_id = item['contentDetails']['videoId']
    channel = item['snippet']['channelTitle']
    published_at = item['contentDetails']['videoPublishedAt']
    video_link = f"https://www.youtube.com/watch?v={video_id}"
    videos.append([title, video_link, channel, published_at])

# Mettre à jour la feuille
RANGE_NAME = "Feuille1!A2:D"
body = {'values': videos}
result = service.spreadsheets().values().update(
    spreadsheetId=SPREADSHEET_ID,
    range=RANGE_NAME,
    valueInputOption='RAW',
    body=body
).execute()

print(f"{result.get('updatedCells')} cellules mises à jour.")
