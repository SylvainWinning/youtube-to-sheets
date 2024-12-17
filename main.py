import os
import requests
import re
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build

# Configuration
CACHE_FILE = "youtube_cache.json"
SERVICE_ACCOUNT_FILE = "service_account.json"

YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")
SPREADSHEET_ID = os.environ.get("SPREADSHEET_ID")
PLAYLIST_ID = "PLtBV_WamBQbAxyF08PXaPxfFwcTejP9vR"

SHEET_HEADERS = [
    "Miniature", "Lien Miniature", "Titre", "Lien", "Chaîne", "Publié le",
    "Durée", "Vues", "J'aime", "Commentaires", "Description", "Tags"
]

def parse_duration(iso_duration):
    """Convertit la durée ISO 8601 en 'mm:ss'."""
    match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', iso_duration)
    h, m, s = map(lambda x: int(x) if x else 0, match.groups())
    total_seconds = h * 3600 + m * 60 + s
    return f"{total_seconds // 60}:{total_seconds % 60:02d}"

def fetch_playlist_items():
    """Récupère les vidéos de la playlist."""
    url = "https://www.googleapis.com/youtube/v3/playlistItems"
    params = {"part": "contentDetails", "playlistId": PLAYLIST_ID, "maxResults": 50, "key": YOUTUBE_API_KEY}
    videos = []

    while url:
        response = requests.get(url, params=params).json()
        videos += [item['contentDetails']['videoId'] for item in response.get('items', [])]
        url = response.get('nextPageToken')
        params["pageToken"] = url
    return videos

def fetch_video_details(video_ids):
    """Récupère les détails des vidéos."""
    url = "https://www.googleapis.com/youtube/v3/videos"
    params = {"part": "snippet,contentDetails,statistics", "id": ",".join(video_ids), "key": YOUTUBE_API_KEY}
    response = requests.get(url, params=params).json()
    return response.get('items', [])

def prepare_video_data(videos):
    """Prépare les données pour Google Sheets."""
    data = []
    for video in videos:
        snippet = video['snippet']
        stats = video.get('statistics', {})
        duration = parse_duration(video['contentDetails']['duration'])
        thumbnail = snippet['thumbnails'].get('high', {}).get('url', "")

        data.append([
            f'=IMAGE("{thumbnail}")', thumbnail,
            snippet['title'], f"https://www.youtube.com/watch?v={video['id']}",
            snippet['channelTitle'], snippet['publishedAt'][:10],
            duration, stats.get('viewCount', 'N/A'),
            stats.get('likeCount', 'N/A'), stats.get('commentCount', 'N/A'),
            snippet.get('description', '').replace("\n", " "),
            ", ".join(snippet.get('tags', []))
        ])
    return data

def update_google_sheets(data):
    """Met à jour les données dans Google Sheets."""
    creds = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE)
    service = build('sheets', 'v4', credentials=creds)

    sheet = service.spreadsheets()
    try:
        # Crée une feuille nommée "Vidéos" si elle n'existe pas
        sheet.batchUpdate(spreadsheetId=SPREADSHEET_ID, body={
            "requests": [{"addSheet": {"properties": {"title": "Vidéos"}}}]
        }).execute()
    except Exception:
        pass  # La feuille existe déjà

    range_name = "Vidéos!A1:L"
    sheet.values().update(
        spreadsheetId=SPREADSHEET_ID,
        range=range_name,
        valueInputOption="USER_ENTERED",
        body={"values": [SHEET_HEADERS] + data}
    ).execute()
    print("Mise à jour terminée avec succès.")

def main():
    """Exécute le script principal."""
    print("Récupération des vidéos...")
    video_ids = fetch_playlist_items()
    print(f"{len(video_ids)} vidéos trouvées.")

    print("Récupération des détails des vidéos...")
    videos = fetch_video_details(video_ids)

    print("Préparation des données...")
    video_data = prepare_video_data(videos)

    print("Mise à jour de Google Sheets...")
    update_google_sheets(video_data)
    print("Synchronisation terminée.")

if __name__ == "__main__":
    main()
