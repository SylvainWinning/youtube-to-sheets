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
    """
    Convertit une durée ISO 8601 (par ex. PT1H20M30S) en format HH:MM:SS.
    """
    pattern = re.compile(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?')
    match = pattern.match(iso_duration)
    hours = int(match.group(1)) if match and match.group(1) else 0
    minutes = int(match.group(2)) if match and match.group(2) else 0
    seconds = int(match.group(3)) if match and match.group(3) else 0
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

def get_duration_category(duration):
    """
    Détermine la catégorie de durée (0-5min, 5-10min, etc.) en fonction de la durée.
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
    if total_seconds <= 300:   # 0-5 min
        return "0-5min"
    elif total_seconds <= 600:  # 5-10 min
        return "5-10min"
    elif total_seconds <= 1200:  # 10-20 min
        return "10-20min"
    elif total_seconds <= 1800:  # 20-30 min
        return "20-30min"
    elif total_seconds <= 2400:  # 30-40 min
        return "30-40min"
    elif total_seconds <= 3000:  # 40-50 min
        return "40-50min"
    elif total_seconds <= 3600:  # 50-60 min
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
    Récupère toutes les vidéos d'une playlist via l'API YouTube,
    en gérant la pagination (maxResults=50).
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
    Retourne un dictionnaire contenant les détails d'une vidéo (snippet, contentDetails, statistics).
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
    Met à jour le Google Sheet en créant des onglets pour chaque catégorie
    et en remplissant les données vidéo correspondantes.
    """
    spreadsheet = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    existing_sheets = {sheet['properties']['title']: sheet['properties']['sheetId'] for sheet in spreadsheet['sheets']}

    requests_batch = []

    # Vérifie si les onglets pour chaque catégorie existent, sinon on les crée
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

    # Si on doit créer de nouvelles feuilles, on exécute la requête en bloc
    if requests_batch:
        service.spreadsheets().batchUpdate(spreadsheetId=spreadsheet_id, body={"requests": requests_batch}).execute()

    # Mise à jour des en-têtes
    for category, videos in videos_by_category.items():
        range_headers = f"{category}!A1:M1"
        service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range=range_headers,
            valueInputOption='USER_ENTERED',
            body={"values": [SHEET_HEADERS]}
        ).execute()
        time.sleep(1)

        if videos:
            # Mise à jour des colonnes A à K (sans toucher la colonne L)
            # Chaque ligne correspond à: [A-K, L, M]
            # A-K = indices 0 à 10
            # L = indice 11
            # M = indice 12
            values_main = [row[:11] for row in videos]  # A-K seulement
            range_data_main = f"{category}!A2:K{len(videos) + 1}"
            service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=range_data_main,
                valueInputOption='USER_ENTERED',
                body={"values": values_main}
            ).execute()
            time.sleep(1)

            # Mise à jour de la colonne M uniquement (avatar)
            values_avatar = [[row[12]] for row in videos]  # Uniquement la dernière colonne (Avatar)
            range_data_avatar = f"{category}!M2:M{len(videos) + 1}"
            service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=range_data_avatar,
                valueInputOption='USER_ENTERED',
                body={"values": values_avatar}
            ).execute()
            time.sleep(1)

        # On récupère l'ID de la feuille pour ajouter des bordures
        sheet_id = None
        for s in spreadsheet['sheets']:
            if s['properties']['title'] == category:
                sheet_id = s['properties']['sheetId']
                break

        # Mise en forme des bordures si la feuille existe et qu'il y a des vidéos
        if sheet_id is not None and videos:
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
    """
    Fonction principale de synchronisation : 
    1. Récupère la liste de toutes les vidéos. 
    2. Charge les credentials du service account. 
    3. Met à jour les feuilles Google pour chaque catégorie de durée.
    """
    # Chargement du cache si disponible, sinon récupération via l'API
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

    # On prépare une structure permettant de stocker les vidéos par catégorie de durée
    videos_by_category = {category: [] for category in CATEGORIES}

    # Boucle sur chaque vidéo récupérée pour traiter ses détails
    for item in items:
        video_id = item['contentDetails']['videoId']
        video_data = get_video_details(video_id, YOUTUBE_API_KEY)
        time.sleep(0.5)

        # Vérifier qu'on a bien au moins un élément dans 'items'
        video_items = video_data.get('items', [])
        if not video_items:
            print(f"Impossible de récupérer les détails pour la vidéo {video_id}, données vides ou inaccessibles.")
            continue

        # Comme on est sûr qu'il y a au moins un item, on peut accéder au premier
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

        # On laisse la colonne L (Catégorie) intacte, on met juste ""
        videos_by_category[category].append([
            thumbnail_url,               # A
            snippet.get("title", ""),    # B
            video_link,                  # C
            channel_title,               # D
            snippet.get("publishedAt", ""), # E
            duration,                    # F
            views,                       # G
            likes,                       # H
            comments,                    # I
            description_courte,          # J
            tags_str,                    # K
            "",                          # L (on n'écrira rien, la valeur ici ne sera pas utilisée)
            avatar_url                   # M
        ])

    # Une fois toutes les vidéos regroupées, on met à jour les onglets correspondants
    update_google_sheets(service, SPREADSHEET_ID, videos_by_category)
    print("Synchronisation terminée.")

if __name__ == "__main__":
    print(f"Début de synchronisation à {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    sync_videos()
    print("Synchronisation terminée.")
