import os
import requests
import re
import time
import sys
import select
from datetime import datetime
from google.oauth2 import service_account
from googleapiclient.discovery import build

def parse_duration(iso_duration):
    pattern = re.compile(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?')
    match = pattern.match(iso_duration)
    hours = int(match.group(1)) if match.group(1) else 0
    minutes = int(match.group(2)) if match.group(2) else 0
    seconds = int(match.group(3)) if match.group(3) else 0

    total_seconds = hours * 3600 + minutes * 60 + seconds
    total_minutes = total_seconds // 60
    remaining_seconds = total_seconds % 60

    return f"{total_minutes}:{remaining_seconds:02d}"

def get_duration_category(duration):
    parts = duration.split(":")
    if len(parts) != 2:
        return "Inconnue"
    try:
        total_minutes = int(parts[0])
        total_seconds = total_minutes * 60 + int(parts[1])
    except ValueError:
        return "Inconnue"

    if total_seconds <= 300:
        return "0-5min"
    elif total_seconds <= 600:
        return "5-10min"
    elif total_seconds <= 1200:
        return "10-20min"
    elif total_seconds <= 1800:
        return "20-30min"
    elif total_seconds <= 2400:
        return "30-40min"
    elif total_seconds <= 3000:
        return "40-50min"
    elif total_seconds <= 3600:
        return "50-60min"
    else:
        return "60+min"

def get_sheet_id(spreadsheet_id, sheet_title, service):
    spreadsheet = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    for sheet in spreadsheet.get("sheets", []):
        if sheet["properties"]["title"] == sheet_title:
            return sheet["properties"]["sheetId"]
    return None

def fetch_all_playlist_items(playlist_id, api_key):
    base_url = "https://www.googleapis.com/youtube/v3/playlistItems"
    params = {
        "part": "snippet,contentDetails",
        "playlistId": playlist_id,
        "maxResults": 50,
        "key": api_key
    }

    all_items = []
    while True:
        response = requests.get(base_url, params=params)
        data = response.json()
        all_items.extend(data.get('items', []))
        if 'nextPageToken' in data:
            params["pageToken"] = data["nextPageToken"]
        else:
            break
    return all_items

def get_thumbnail_url(video_data):
    # Essayer la meilleure miniature
    thumb_info = video_data['items'][0]['snippet'].get('thumbnails', {})
    for quality in ['high', 'standard', 'medium', 'default']:
        if quality in thumb_info:
            return thumb_info[quality]['url']
    return ""

def sync_videos():
    YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")
    SPREADSHEET_ID = os.environ.get("SPREADSHEET_ID")

    SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
    SERVICE_ACCOUNT_FILE = 'service_account.json'
    creds = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    service = build('sheets', 'v4', credentials=creds)

    PLAYLIST_ID = "PLtBV_WamBQbAxyF08PXaPxfFwcTejP9vR"
    items = fetch_all_playlist_items(PLAYLIST_ID, YOUTUBE_API_KEY)

    videos_by_category = {
        "0-5min": [],
        "5-10min": [],
        "10-20min": [],
        "20-30min": [],
        "30-40min": [],
        "40-50min": [],
        "50-60min": [],
        "60+min": []
    }

    for item in items:
        title = item['snippet']['title']
        video_id = item['contentDetails']['videoId']
        published_at = item['snippet']['publishedAt']

        dt = datetime.strptime(published_at, "%Y-%m-%dT%H:%M:%SZ")
        published_at_formatted = dt.strftime("%d/%m/%Y")

        video_link = f"https://www.youtube.com/watch?v={video_id}"
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
            thumbnail_url = get_thumbnail_url(video_data)
        else:
            channel = "Inconnu"
            video_duration = "Inconnue"
            thumbnail_url = ""

        category = get_duration_category(video_duration)
        videos_by_category[category].append([title, video_link, channel, published_at_formatted, video_duration, thumbnail_url])

    for category, videos in videos_by_category.items():
        RANGE_NAME = f"'{category}'!A2:F"

        # Créer l'onglet s'il n'existe pas
        try:
            service.spreadsheets().batchUpdate(
                spreadsheetId=SPREADSHEET_ID,
                body={
                    "requests": [
                        {
                            "addSheet": {
                                "properties": {
                                    "title": category
                                }
                            }
                        }
                    ]
                }
            ).execute()
        except Exception:
            pass

        sheet_id = get_sheet_id(SPREADSHEET_ID, category, service)

        body = {'values': videos}
        service.spreadsheets().values().update(
            spreadsheetId=SPREADSHEET_ID,
            range=RANGE_NAME,
            valueInputOption='RAW',
            body=body
        ).execute()

        num_rows = len(videos)
        if num_rows > 0 and sheet_id is not None:
            service.spreadsheets().batchUpdate(
                spreadsheetId=SPREADSHEET_ID,
                body={
                    "requests": [
                        {
                            "updateBorders": {
                                "range": {
                                    "sheetId": sheet_id,
                                    "startRowIndex": 1,       # A partir de la ligne 2
                                    "endRowIndex": 1 + num_rows,
                                    "startColumnIndex": 0,    # A=0
                                    "endColumnIndex": 6       # F = 5, endColumnIndex = 6
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
                }
            ).execute()

    print("Synchronisation terminée. Toutes les vidéos sont présentes, avec miniature, sans affichage d'heures, bordures ajoutées.")

# Boucle pour synchroniser toutes les heures ou manuellement
while True:
    sync_videos()
    print("En attente pour la prochaine synchronisation. Appuyez sur Entrée pour synchroniser immédiatement, ou attendez 1 heure...")
    # Attendre soit une entrée manuelle (Entrée) soit 1 heure
    # On utilise select.select pour attendre l'entrée standard pendant 3600 secondes
    rlist, _, _ = select.select([sys.stdin], [], [], 3600)
    if rlist:
        # L'utilisateur a appuyé sur Entrée -> synchronisation immédiate, ensuite la boucle reprend
        input()  # lire la ligne vide
        print("Synchronisation manuelle demandée.")
        # La boucle reprend et relance sync_videos() immédiatement
        continue
    else:
        # 1 heure s'est écoulée, on relance la boucle pour la synchro automatique
        pass
