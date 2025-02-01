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
SHEET_HEADERS = [
    "Miniature", 
    "Titre", 
    "Lien", 
    "Chaîne", 
    "Publié le", 
    "Durée", 
    "Vues", 
    "J'aime", 
    "Commentaires", 
    "Description courte", 
    "Tags", 
    "Catégorie",  # Colonne laissée vide
    "Avatar"
]

def parse_duration(iso_duration):
    """
    Convertit une durée ISO 8601 (ex: PT1H20M30S) en format HH:MM:SS.
    """
    pattern = re.compile(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?')
    match = pattern.match(iso_duration)
    hours = int(match.group(1)) if match and match.group(1) else 0
    minutes = int(match.group(2)) if match and match.group(2) else 0
    seconds = int(match.group(3)) if match and match.group(3) else 0
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

def get_duration_category(duration):
    """
    Détermine la catégorie de durée (0-5min, 5-10min, etc.) en fonction du format HH:MM:SS.
    """
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
    
    if total_seconds <= 300:    # 0-5 min
        return "0-5min"
    elif total_seconds <= 600:  # 5-10 min
        return "5-10min"
    elif total_seconds <= 1200: # 10-20 min
        return "10-20min"
    elif total_seconds <= 1800: # 20-30 min
        return "20-30min"
    elif total_seconds <= 2400: # 30-40 min
        return "30-40min"
    elif total_seconds <= 3000: # 40-50 min
        return "40-50min"
    elif total_seconds <= 3600: # 50-60 min
        return "50-60min"
    else:
        return "60Plusmin"

def save_cache(data):
    """
    Sauvegarde les données dans un fichier JSON pour éviter les appels redondants à l’API.
    """
    with open(CACHE_FILE, "w") as file:
        json.dump(data, file)

def load_cache():
    """
    Charge les données depuis le cache, s'il existe.
    """
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r") as file:
            return json.load(file)
    return None

def fetch_all_playlist_items(playlist_id, api_key):
    """
    Récupère toutes les vidéos d'une playlist via l'API YouTube en gérant la pagination.
    """
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
    """
    Retourne un dictionnaire contenant les détails d'une vidéo.
    """
    url = "https://www.googleapis.com/youtube/v3/videos"
    params = {"part": "snippet,contentDetails,statistics", "id": video_id, "key": api_key}
    response = requests.get(url, params=params)
    return response.json()

def get_channel_avatar(channel_id, api_key):
    """
    Récupère l'URL de l'avatar de la chaîne YouTube à partir de son ID.
    """
    url = "https://www.googleapis.com/youtube/v3/channels"
    params = {"part": "snippet", "id": channel_id, "key": api_key}
    response = requests.get(url, params=params)
    data = response.json()
    avatar_url = data.get('items', [{}])[0].get('snippet', {}).get('thumbnails', {}).get('high', {}).get('url', '')
    return avatar_url

def update_google_sheets(service, spreadsheet_id, videos_by_category):
    """
    Met à jour le Google Sheet en créant un onglet par catégorie et en y insérant les données vidéo.
    Avant insertion, le contenu de chaque feuille est vidé pour éviter les doublons.
    """
    spreadsheet = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    existing_sheets = {sheet['properties']['title']: sheet['properties']['sheetId'] for sheet in spreadsheet['sheets']}

    requests_batch = []

    # Création des feuilles manquantes
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
        service.spreadsheets().batchUpdate(
            spreadsheetId=spreadsheet_id, 
            body={"requests": requests_batch}
        ).execute()

    # Pour chaque catégorie, effacer la feuille puis insérer les nouvelles données
    for category, videos in videos_by_category.items():
        # Effacer la feuille (colonnes A à Z par sécurité)
        clear_range = f"{category}!A:Z"
        service.spreadsheets().values().clear(
            spreadsheetId=spreadsheet_id,
            range=clear_range
        ).execute()
        time.sleep(1)

        # Mise à jour des en-têtes
        range_headers = f"{category}!A1:M1"
        service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range=range_headers,
            valueInputOption='USER_ENTERED',
            body={"values": [SHEET_HEADERS]}
        ).execute()
        time.sleep(1)

        # Insertion des données vidéo
        if videos:
            # Colonnes A à K (indices 0 à 10)
            values_main = [row[:11] for row in videos]  
            range_data_main = f"{category}!A2:K{len(videos) + 1}"
            service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=range_data_main,
                valueInputOption='USER_ENTERED',
                body={"values": values_main}
            ).execute()
            time.sleep(1)

            # Colonne M (Avatar) uniquement (indice 12)
            values_avatar = [[row[12]] for row in videos]
            range_data_avatar = f"{category}!M2:M{len(videos) + 1}"
            service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=range_data_avatar,
                valueInputOption='USER_ENTERED',
                body={"values": values_avatar}
            ).execute()
            time.sleep(1)

        # Récupération de l'ID de la feuille pour ajouter des bordures
        sheet_id = None
        for s in spreadsheet['sheets']:
            if s['properties']['title'] == category:
                sheet_id = s['properties']['sheetId']
                break

        # Mise en forme des bordures si la feuille existe et contient des données
        if sheet_id is not None and videos:
            num_rows = len(videos) + 1  # +1 pour l'entête
            border_requests = {
                "requests": [
                    {
                        "updateBorders": {
                            "range": {
                                "sheetId": sheet_id,
                                "startRowIndex": 0,
                                "endRowIndex": num_rows,
                                "startColumnIndex": 0,
                                "endColumnIndex": 13  # Colonnes A à M
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
            service.spreadsheets().batchUpdate(
                spreadsheetId=spreadsheet_id, 
                body=border_requests
            ).execute()
            time.sleep(1)

def sync_videos():
    """
    Fonction principale de synchronisation lancée manuellement.
    Récupère les vidéos d'une playlist YouTube et met à jour un Google Sheet
    en les répartissant par catégorie de durée.
    """
    # Debug : affichage des variables d'environnement et du répertoire de travail
    print("YOUTUBE_API_KEY =", YOUTUBE_API_KEY)
    print("SPREADSHEET_ID =", SPREADSHEET_ID)
    print("Répertoire de travail :", os.getcwd())

    # Chargement du cache si disponible, sinon récupération via l'API YouTube
    cached_data = load_cache()
    if cached_data:
        print("Données chargées depuis le cache")
        items = cached_data
    else:
        print("Récupération des données depuis l'API YouTube...")
        items = fetch_all_playlist_items(PLAYLIST_ID, YOUTUBE_API_KEY)
        save_cache(items)

    # Connexion à l'API Google Sheets
    SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
    creds = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    service = build('sheets', 'v4', credentials=creds)

    # Préparation des vidéos par catégorie de durée
    videos_by_category = {category: [] for category in CATEGORIES}

    for item in items:
        video_id = item['contentDetails']['videoId']
        video_data = get_video_details(video_id, YOUTUBE_API_KEY)
        time.sleep(0.5)

        video_items = video_data.get('items', [])
        if not video_items:
            print(f"Impossible de récupérer les détails pour la vidéo {video_id}.")
            continue

        video_info = video_items[0]
        snippet = video_info.get('snippet', {})
        content_details = video_info.get('contentDetails', {})
        statistics = video_info.get('statistics', {})

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

        videos_by_category[category].append([
            thumbnail_url,                     # Colonne A
            snippet.get("title", ""),          # Colonne B
            video_link,                        # Colonne C
            channel_title,                     # Colonne D
            snippet.get("publishedAt", ""),    # Colonne E
            duration,                          # Colonne F
            views,                             # Colonne G
            likes,                             # Colonne H
            comments,                          # Colonne I
            description_courte,                # Colonne J
            tags_str,                          # Colonne K
            "",                                # Colonne L (Catégorie laissée vide)
            avatar_url                         # Colonne M
        ])

    update_google_sheets(service, SPREADSHEET_ID, videos_by_category)
    print("Synchronisation terminée.")

if __name__ == "__main__":
    print(f"Début de synchronisation à {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    sync_videos()
    print("Synchronisation terminée.")
