import re
import time
import json
import os
import requests
from datetime import datetime
from google.oauth2 import service_account
from googleapiclient.discovery import build

# Fichiers et configurations
CACHE_FILE = "youtube_cache.json"
SERVICE_ACCOUNT_FILE = "service_account.json"
YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")
SPREADSHEET_ID = os.environ.get("SPREADSHEET_ID")
PLAYLIST_ID = "PLtBV_WamBQbAxyF08PXaPxfFwcTejP9vR"

CATEGORIES = ["0-5min", "5-10min", "10-20min", "20-30min", "30-40min", "40-50min", "50-60min", "60Plusmin"]

# Ajout de la colonne "Catégorie" avant "Avatar"
SHEET_HEADERS = ["Miniature", "Titre", "Lien", "Chaîne", "Publié le", "Durée", "Vues", "J'aime", "Commentaires", "Description courte", "Tags", "Catégorie", "Avatar"]

def parse_duration(iso_duration):
    pattern = re.compile(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?')
    match = pattern.match(iso_duration)
    hours = int(match.group(1)) if match.group(1) else 0
    minutes = int(match.group(2)) if match.group(2) else 0
    seconds = int(match.group(3)) if match.group(3) else 0
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

def get_duration_category(duration):
    parts = duration.split(":")
    if len(parts) != 3:
        return "Inconnue"
    try:
        hours = int(parts[0])
        minutes = int(parts[1])
        seconds = int(parts[2])
        total_seconds = hours * 3600 + minutes * 60 + seconds
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
        return "60Plusmin"

def save_cache(data):
    with open(CACHE_FILE, "w") as file:
        json.dump(data, file)

def load_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r") as file:
            return json.load(file)
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
    page = 1
    while True:
        try:
            response = requests.get(base_url, params=params)
            if response.status_code != 200:
                print(f"Erreur: {response.status_code} - {response.text}")
                break
            data = response.json()
            items = data.get('items', [])
            all_items.extend(items)
            print(f"Page {page} : {len(items)} vidéos récupérées")
            if 'nextPageToken' in data:
                params["pageToken"] = data["nextPageToken"]
                page += 1
                time.sleep(1)
            else:
                break
        except Exception as e:
            print(f"Erreur de connexion : {e}")
            time.sleep(5)
    return all_items

def get_video_details(video_id, api_key):
    url = "https://www.googleapis.com/youtube/v3/videos"
    params = {"part": "snippet,contentDetails,statistics", "id": video_id, "key": api_key}
    response = requests.get(url, params=params)
    return response.json()

def get_channel_avatar(channel_id, api_key):
    url = "https://www.googleapis.com/youtube/v3/channels"
    params = {"part": "snippet", "id": channel_id, "key": api_key}
    response = requests.get(url, params=params)
    data = response.json()
    avatar_url = data.get('items', [{}])[0].get('snippet', {}).get('thumbnails', {}).get('high', {}).get('url', '')
    return avatar_url

def update_google_sheets(service, spreadsheet_id, videos_by_category):
    spreadsheet = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    existing_sheets = {sheet['properties']['title']: sheet['properties']['sheetId'] for sheet in spreadsheet['sheets']}

    requests_batch = []

    for category, videos in videos_by_category.items():
        if category not in existing_sheets:
            requests_batch.append({
                "addSheet": {
                    "properties": {
                        "title": category
                    }
                }
            })
        else:
            print(f"La feuille '{category}' existe déjà, elle sera mise à jour.")

    if requests_batch:
        service.spreadsheets().batchUpdate(spreadsheetId=spreadsheet_id, body={"requests": requests_batch}).execute()

    for category, videos in videos_by_category.items():
        range_headers = f"{category}!A1:M1"
        service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range=range_headers,
            valueInputOption='USER_ENTERED',
            body={"values": [SHEET_HEADERS]}
        ).execute()
        time.sleep(1)

        range_data = f"{category}!A2:M{len(videos) + 1}"
        service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range=range_data,
            valueInputOption='USER_ENTERED',
            body={"values": videos}
        ).execute()
        time.sleep(1)

        sheet_id = None
        for s in spreadsheet['sheets']:
            if s['properties']['title'] == category:
                sheet_id = s['properties']['sheetId']
                break

        if sheet_id is not None:
            num_rows = len(videos) + 1
            border_requests = {
                "requests": [
                    {
                        "updateBorders": {
                            "range": {
                                "sheetId": sheet_id,
                                "startRowIndex": 0,
                                "endRowIndex": num_rows,
                                "startColumnIndex": 0,
                                "endColumnIndex": 13  # 0 à 12 (13 colonnes)
                            },
                            "top": {"style": "SOLID", "width": 1, "color": {"red": 0, "green": 0, "blue": 0}},
                            "bottom": {"style": "SOLID", "width": 1, "color": {"red": 0, "green": 0, "blue": 0}},
                            "left": {"style": "SOLID", "width": 1, "color": {"red": 0, "green": 0, "blue": 0}},
                            "right": {"style": "SOLID", "width": 1, "color": {"red": 0, "green": 0, "blue": 0}},
                            "innerHorizontal": {"style": "SOLID", "width": 1, "color": {"red": 0, "green": 0, "blue": 0}},
                            "innerVertical": {"style": "SOLID", "width": 1, "color": {"red": 0, "green": 0, "blue": 0}}
                        }
                    }
                ]
            }

            service.spreadsheets().batchUpdate(spreadsheetId=spreadsheet_id, body=border_requests).execute()
            time.sleep(1)

def sync_videos():
    cached_data = load_cache()
    if cached_data:
        print("Données chargées depuis le cache")
        items = cached_data
    else:
        print("Récupération des données depuis l'API YouTube...")
        items = fetch_all_playlist_items(PLAYLIST_ID, YOUTUBE_API_KEY)
        save_cache(items)

    SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
    creds = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    service = build('sheets', 'v4', credentials=creds)

    videos_by_category = {category: [] for category in CATEGORIES}

    for item in items:
        video_id = item['contentDetails']['videoId']
        video_data = get_video_details(video_id, YOUTUBE_API_KEY)
        time.sleep(0.5)
        snippet = video_data.get('items', [{}])[0].get('snippet', {})
        content_details = video_data.get('items', [{}])[0].get('contentDetails', {})
        statistics = video_data.get('items', [{}])[0].get('statistics', {})

        duration = parse_duration(content_details.get('duration', 'PT0S'))
        category = get_duration_category(duration)
        video_link = f"https://www.youtube.com/watch?v={video_id}"

        thumbnail_url = snippet.get("thumbnails", {}).get("high", {}).get("url", "")
        views = statistics.get('viewCount', "")
        likes = statistics.get('likeCount', "")
        comments = statistics.get('commentCount', "")
        tags = snippet.get('tags', [])
        tags_str = ", ".join(tags)
        description_courte = snippet.get('description', '')[:100]
        channel_title = snippet.get('channelTitle', 'Inconnu')
        channel_id = snippet.get('channelId', '')
        avatar_url = get_channel_avatar(channel_id, YOUTUBE_API_KEY)

        # La colonne "Catégorie" est maintenant laissée vide
        videos_by_category[category].append([
            thumbnail_url,
            snippet.get("title", "Inconnu"),
            video_link,
            channel_title,
            snippet.get("publishedAt", ""),
            duration,
            views,
            likes,
            comments,
            description_courte,
            tags_str,
            "",            # Colonne catégorie vide
            avatar_url     # Lien avatar en dernier
        ])

    update_google_sheets(service, SPREADSHEET_ID, videos_by_category)
    print("Synchronisation terminée.")

if __name__ == "__main__":
    print(f"Début de synchronisation à {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    sync_videos()
    print("Synchronisation terminée.")
