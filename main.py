import os
import requests
import re
import time
import json
from datetime import datetime
from google.oauth2 import service_account
from googleapiclient.discovery import build

# Configuration
CACHE_FILE = "youtube_cache.json"
SERVICE_ACCOUNT_FILE = "service_account.json"

YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")
SPREADSHEET_ID = os.environ.get("SPREADSHEET_ID")
PLAYLIST_ID = "PLtBV_WamBQbAxyF08PXaPxfFwcTejP9vR"

CATEGORIES = ["0-5min", "5-10min", "10-20min", "20-30min", "30-40min", "40-50min", "50-60min", "60+min"]
SHEET_HEADERS = [
    "Miniature", "Lien Miniature", "Titre", "Lien", "Chaîne", "Publié le",
    "Durée", "Vues", "J'aime", "Commentaires", "Description courte", "Tags"
]

def parse_duration(iso_duration):
    """Convertit la durée ISO 8601 en format 'mm:ss'."""
    pattern = re.compile(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?')
    match = pattern.match(iso_duration)
    hours = int(match.group(1)) if match.group(1) else 0
    minutes = int(match.group(2)) if match.group(2) else 0
    seconds = int(match.group(3)) if match.group(3) else 0
    total_seconds = hours * 3600 + minutes * 60 + seconds
    return f"{total_seconds // 60}:{total_seconds % 60:02d}"

def get_duration_category(duration):
    """Classe la vidéo par durée."""
    minutes = int(duration.split(":")[0])
    if minutes <= 5: return "0-5min"
    if minutes <= 10: return "5-10min"
    if minutes <= 20: return "10-20min"
    if minutes <= 30: return "20-30min"
    if minutes <= 40: return "30-40min"
    if minutes <= 50: return "40-50min"
    if minutes <= 60: return "50-60min"
    return "60+min"

def save_cache(data):
    """Enregistre les données dans un cache local."""
    with open(CACHE_FILE, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False)

def load_cache():
    """Charge les données depuis le cache local."""
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r", encoding="utf-8") as file:
            return json.load(file)
    return None

def fetch_all_playlist_items(playlist_id, api_key):
    """Récupère toutes les vidéos d'une playlist YouTube."""
    base_url = "https://www.googleapis.com/youtube/v3/playlistItems"
    params = {"part": "snippet,contentDetails", "playlistId": playlist_id, "maxResults": 50, "key": api_key}
    all_items = []
    page = 1

    while True:
        try:
            response = requests.get(base_url, params=params)
            data = response.json()

            if "error" in data:
                print(f"Erreur API : {data['error']['message']}")
                break

            items = data.get("items", [])
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
    print(f"Total des vidéos récupérées : {len(all_items)}")
    return all_items

def get_video_details(video_id, api_key):
    """Récupère les détails d'une vidéo spécifique."""
    url = "https://www.googleapis.com/youtube/v3/videos"
    params = {"part": "snippet,contentDetails,statistics", "id": video_id, "key": api_key}
    response = requests.get(url, params=params)
    return response.json()

def clean_text(text):
    """Nettoie le texte pour éviter les décalages (suppression des retours à la ligne)."""
    if text:
        return text.replace("\n", " ").replace("\r", " ")
    return ""

def get_thumbnail_url(snippet):
    """Récupère l'URL de la miniature, en vérifiant différentes qualités."""
    thumbnails = snippet.get("thumbnails", {})
    for quality in ["high", "standard", "medium", "default"]:
        url = thumbnails.get(quality, {}).get("url")
        if url:
            return url
    return ""

def sync_videos():
    """Synchronise les vidéos de YouTube vers Google Sheets."""
    cached_data = load_cache()
    if cached_data:
        print("Données chargées depuis le cache")
        items = cached_data
    else:
        print("Récupération des données depuis l'API YouTube...")
        items = fetch_all_playlist_items(PLAYLIST_ID, YOUTUBE_API_KEY)
        save_cache(items)
        print("Données sauvegardées dans le cache")

    creds = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE)
    service = build('sheets', 'v4', credentials=creds)

    videos_by_category = {category: [] for category in CATEGORIES}
    for item in items:
        video_id = item['contentDetails']['videoId']
        video_data = get_video_details(video_id, YOUTUBE_API_KEY)
        video_items = video_data.get('items', [])
        
        if not video_items:
            # Vidéo non trouvée, on ignore
            continue
        
        video_info = video_items[0]
        snippet = video_info.get('snippet', {})
        stats = video_info.get('statistics', {})
        duration = parse_duration(video_info.get('contentDetails', {}).get('duration', 'PT0S'))
        category = get_duration_category(duration)
        
        thumbnail_url = get_thumbnail_url(snippet)
        title = clean_text(snippet.get("title", "Inconnu"))
        channel = clean_text(snippet.get("channelTitle", "Inconnu"))
        published_date = snippet.get("publishedAt", "")[:10]
        view_count = stats.get("viewCount", "N/A")
        like_count = stats.get("likeCount", "N/A")
        comment_count = stats.get("commentCount", "N/A")
        description = clean_text(snippet.get("description", ""))
        tags = snippet.get("tags", [])
        tags_str = ", ".join(tags)

        videos_by_category[category].append([
            f'=IMAGE("{thumbnail_url}")',
            thumbnail_url,
            title,
            f"https://www.youtube.com/watch?v={video_id}",
            channel,
            published_date,
            duration,
            view_count,
            like_count,
            comment_count,
            description,
            tags_str
        ])

    # Mise à jour des feuilles Google Sheets
    for category, videos in videos_by_category.items():
        sheet = service.spreadsheets()
        # On tente d'ajouter une feuille si elle n'existe pas
        try:
            sheet.batchUpdate(spreadsheetId=SPREADSHEET_ID, body={
                "requests": [{"addSheet": {"properties": {"title": category}}}]
            }).execute()
        except Exception:
            # Si la feuille existe déjà, on passe
            pass

        range_name = f"'{category}'!A1:L"
        sheet.values().update(
            spreadsheetId=SPREADSHEET_ID, range=range_name,
            valueInputOption="USER_ENTERED", body={"values": [SHEET_HEADERS] + videos}
        ).execute()
    print("Synchronisation terminée avec Google Sheets")

if __name__ == "__main__":
    sync_videos()
