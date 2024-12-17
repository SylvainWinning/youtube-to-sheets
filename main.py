import re
import time
import random
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

CATEGORIES = ["0-5min", "5-10min", "10-20min", "20-30min", "30-40min", "40-50min", "50-60min", "60+min"]
SHEET_HEADERS = ["Miniature", "Titre", "Lien", "Chaîne", "Publié le", "Durée", "Vues", "J'aime", "Commentaires", "Description courte", "Tags"]

# Fonction pour parser la durée ISO8601
def parse_duration(iso_duration):
    pattern = re.compile(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?')
    match = pattern.match(iso_duration)
    hours = int(match.group(1)) if match.group(1) else 0
    minutes = int(match.group(2)) if match.group(2) else 0
    seconds = int(match.group(3)) if match.group(3) else 0
    return f"{hours*60+minutes}:{seconds:02d}"

# Détermine la catégorie de durée
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

def save_cache(data):
    with open(CACHE_FILE, "w") as file:
        json.dump(data, file)

def load_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r") as file:
            return json.load(file)
    return None

# Fonction pour récupérer toutes les vidéos avec pagination
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
                time.sleep(1)  # Pause pour éviter les quotas
            else:
                break
        except Exception as e:
            print(f"Erreur de connexion : {e}")
            time.sleep(5)  # Attente avant relance
    print(f"Nombre total de vidéos récupérées : {len(all_items)}")
    return all_items

# Fonction pour récupérer l'URL de la miniature
def get_thumbnail_url(video_data):
    thumb_info = video_data['items'][0]['snippet'].get('thumbnails', {})
    for quality in ['high', 'standard', 'medium', 'default']:
        if quality in thumb_info:
            return thumb_info[quality]['url']
    return ""

def get_video_details(video_id, api_key):
    url = "https://www.googleapis.com/youtube/v3/videos"
    params = {"part": "snippet,contentDetails,statistics", "id": video_id, "key": api_key}
    response = requests.get(url, params=params)
    return response.json()

def sync_videos():
    # Chargement éventuel du cache
    cached_data = load_cache()
    if cached_data:
        print("Données chargées depuis le cache")
        items = cached_data
    else:
        print("Récupération des données depuis l'API YouTube...")
        items = fetch_all_playlist_items(PLAYLIST_ID, YOUTUBE_API_KEY)
        save_cache(items)
        print("Données sauvegardées dans le cache")

    # Création des credentials Google Sheets
    SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
    creds = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    service = build('sheets', 'v4', credentials=creds)

    # Organisation des vidéos par catégorie
    videos_by_category = {category: [] for category in CATEGORIES}

    for item in items:
        video_id = item['contentDetails']['videoId']
        video_data = get_video_details(video_id, YOUTUBE_API_KEY)
        video_info = video_data.get('items', [{}])[0]
        snippet = video_info.get('snippet', {})
        stats = video_info.get('statistics', {})
        duration_iso = video_info.get('contentDetails', {}).get('duration', 'PT0S')
        video_duration = parse_duration(duration_iso)
        thumbnail_url = snippet.get("thumbnails", {}).get("high", {}).get("url", "")
        published_at = snippet.get("publishedAt", "")
        if published_at:
            dt = datetime.strptime(published_at, "%Y-%m-%dT%H:%M:%SZ")
            published_at_formatted = dt.strftime("%d/%m/%Y")
        else:
            published_at_formatted = ""

        category = get_duration_category(video_duration)
        video_link = f"https://www.youtube.com/watch?v={video_id}"
        videos_by_category[category].append([
            f'=IMAGE("{thumbnail_url}")' if thumbnail_url else "",
            snippet.get("title", "Inconnu"),
            video_link,
            snippet.get("channelTitle", "Inconnu"),
            published_at_formatted,
            video_duration,
            stats.get("viewCount", "N/A"),
            stats.get("likeCount", "N/A"),
            stats.get("commentCount", "N/A"),
            snippet.get("description", ""),
            ", ".join(snippet.get("tags", []))
        ])

    # Mise à jour des feuilles Google Sheets
    for category, videos in videos_by_category.items():
        random.shuffle(videos)
        range_name_headers = f"'{category}'!A1:K1"
        range_name_data = f"'{category}'!A2:K"
        sheet = service.spreadsheets()
        # Création de la feuille si elle n'existe pas
        try:
            sheet.batchUpdate(
                spreadsheetId=SPREADSHEET_ID,
                body={"requests": [{"addSheet": {"properties": {"title": category}}}]}
            ).execute()
        except Exception:
            pass  # La feuille existe déjà
        
        # Ajout des en-têtes
        sheet.values().update(
            spreadsheetId=SPREADSHEET_ID,
            range=range_name_headers,
            valueInputOption='USER_ENTERED',
            body={'values': [SHEET_HEADERS]}
        ).execute()

        # Ajout des données
        sheet.values().update(
            spreadsheetId=SPREADSHEET_ID,
            range=range_name_data,
            valueInputOption='USER_ENTERED',
            body={'values': videos}
        ).execute()

    print("Synchronisation terminée.")

if __name__ == "__main__":
    while True:
        sync_videos()
