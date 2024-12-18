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

# Mise à jour des en-têtes pour inclure la miniature, le titre, le lien, la chaîne, la date de publication, 
# la durée, les vues, les "j'aime", les commentaires, une description courte et les tags
SHEET_HEADERS = ["Miniature", "Titre", "Lien", "Chaîne", "Publié le", "Durée", "Vues", "J'aime", "Commentaires", "Description courte", "Tags"]

# Fonction pour parser la durée ISO8601
def parse_duration(iso_duration):
    pattern = re.compile(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?')
    match = pattern.match(iso_duration)
    hours = int(match.group(1)) if match.group(1) else 0
    minutes = int(match.group(2)) if match.group(2) else 0
    seconds = int(match.group(3)) if match.group(3) else 0
    return f"{hours*60+minutes}:{seconds:02d}"

# Catégoriser la vidéo selon sa durée
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

# Logiciel de mise en cache
def save_cache(data):
    with open(CACHE_FILE, "w") as file:
        json.dump(data, file)

def load_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r") as file:
            return json.load(file)
    return None

# Récupérer tous les éléments d'une playlist
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
            time.sleep(5)
    return all_items

# Récupérer les détails d'une vidéo
def get_video_details(video_id, api_key):
    url = "https://www.googleapis.com/youtube/v3/videos"
    params = {"part": "snippet,contentDetails,statistics", "id": video_id, "key": api_key}
    response = requests.get(url, params=params)
    return response.json()

# Mettre à jour Google Sheets avec batchUpdate
def update_google_sheets(service, spreadsheet_id, videos_by_category):
    # Obtenir les informations actuelles des feuilles dans le document
    spreadsheet = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    existing_sheets = {sheet['properties']['title']: sheet['properties']['sheetId'] for sheet in spreadsheet['sheets']}

    requests_batch = []

    # Ajouter ou mettre à jour les feuilles pour chaque catégorie
    for category, videos in videos_by_category.items():
        if category not in existing_sheets:
            # Ajouter une nouvelle feuille si elle n'existe pas
            requests_batch.append({
                "addSheet": {
                    "properties": {
                        "title": category
                    }
                }
            })
        else:
            print(f"La feuille '{category}' existe déjà, elle sera mise à jour.")

    # Envoyer les requêtes pour créer les nouvelles feuilles
    if requests_batch:
        service.spreadsheets().batchUpdate(spreadsheetId=spreadsheet_id, body={"requests": requests_batch}).execute()

    # Mettre à jour les données dans les feuilles
    for category, videos in videos_by_category.items():
        # Ajouter les en-têtes
        range_headers = f"{category}!A1:K1"
        service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range=range_headers,
            valueInputOption='USER_ENTERED',
            body={"values": [SHEET_HEADERS]}
        ).execute()
        time.sleep(1)  # Pause entre les mises à jour pour respecter les quotas

        # Ajouter les données
        range_data = f"{category}!A2:K{len(videos) + 1}"
        service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range=range_data,
            valueInputOption='USER_ENTERED',
            body={"values": videos}
        ).execute()
        time.sleep(1)  # Pause entre les mises à jour pour respecter les quotas

# Synchroniser les vidéos
def sync_videos():
    cached_data = load_cache()
    if cached_data:
        print("Données chargées depuis le cache")
        items = cached_data
    else:
        print("Récupération des données depuis l'API YouTube...")
        items = fetch_all_playlist_items(PLAYLIST_ID, YOUTUBE_API_KEY)
        save_cache(items)

    # Initialiser l'API Sheets
    SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
    creds = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    service = build('sheets', 'v4', credentials=creds)

    videos_by_category = {category: [] for category in CATEGORIES}

    # Traiter les données de chaque vidéo
    for item in items:
        video_id = item['contentDetails']['videoId']
        video_data = get_video_details(video_id, YOUTUBE_API_KEY)
        time.sleep(0.5)  # Pause entre les appels API
        snippet = video_data.get('items', [{}])[0].get('snippet', {})
        content_details = video_data.get('items', [{}])[0].get('contentDetails', {})
        statistics = video_data.get('items', [{}])[0].get('statistics', {})

        duration = parse_duration(content_details.get('duration', 'PT0S'))
        category = get_duration_category(duration)
        video_link = f"https://www.youtube.com/watch?v={video_id}"

        # Récupération des informations supplémentaires
        thumbnail_url = snippet.get("thumbnails", {}).get("high", {}).get("url", "")
        views = statistics.get('viewCount', "")
        likes = statistics.get('likeCount', "")
        comments = statistics.get('commentCount', "")
        tags = snippet.get('tags', [])
        tags_str = ", ".join(tags)
        description_courte = snippet.get('description', '')[:100]
        channel_title = snippet.get('channelTitle', 'Inconnu')

        # Insérer les données dans l'ordre défini par SHEET_HEADERS
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
            tags_str
        ])

    update_google_sheets(service, SPREADSHEET_ID, videos_by_category)
    print("Synchronisation terminée.")

# Lancer une synchronisation unique
if __name__ == "__main__":
    print(f"Début de synchronisation à {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    sync_videos()
    print("Synchronisation terminée.")
