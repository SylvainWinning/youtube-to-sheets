import os
import requests
import re
import random
import time
import logging
from datetime import datetime
from google.oauth2 import service_account
from googleapiclient.discovery import build

# Colonnes attendues pour l’export CSV/Google Sheets
HEADERS = [
    "channelAvatar",
    "title",
    "link",
    "channel",
    "publishedAt",
    "duration",
    "views",
    "likes",
    "comments",
    "shortDescription",
    "tags",
    "category",
    "thumbnail",
]

DEFAULT_AVATAR_URL = "https://via.placeholder.com/48"
DEFAULT_THUMBNAIL_URL = "https://via.placeholder.com/480x360?text=No+Thumbnail"

def parse_duration(iso_duration):
    """Convertit une durée ISO 8601 (ex. 'PT5M20S') en 'HH:MM:SS'."""
    pattern = re.compile(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?")
    match = pattern.match(iso_duration)
    if not match:
        return "Inconnue"
    h = int(match.group(1)) if match.group(1) else 0
    m = int(match.group(2)) if match.group(2) else 0
    s = int(match.group(3)) if match.group(3) else 0
    return f"{h:02d}:{m:02d}:{s:02d}"

def get_duration_category(duration):
    """Classe la durée en catégories (0-5 min, 5-10 min, etc.)."""
    parts = duration.split(":")
    if len(parts) != 3:
        return "Inconnue"
    try:
        h = int(parts[0])
        m = int(parts[1])
        s = int(parts[2])
    except ValueError:
        return "Inconnue"
    total_seconds = h * 3600 + m * 60 + s
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

def get_sheet_id(spreadsheet_id, sheet_title, service):
    """Retourne l’ID de feuille correspondant au titre dans un Google Sheet."""
    spreadsheet = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    for sheet in spreadsheet.get("sheets", []):
        if sheet["properties"]["title"] == sheet_title:
            return sheet["properties"]["sheetId"]
    return None

def fetch_all_playlist_items(playlist_id, api_key, max_retries=5):
    """
    Récupère tous les items d’une playlist YouTube en gérant la pagination,
    avec gestion d’erreurs réseau.

    Limite le nombre de tentatives pour éviter des boucles infinies en cas
    d'erreur persistante (ex. clé d'API invalide).
    """
    base_url = "https://www.googleapis.com/youtube/v3/playlistItems"
    params = {
        "part": "snippet,contentDetails",
        "playlistId": playlist_id,
        "maxResults": 50,
        "key": api_key,
    }
    items = []
    backoff = 1
    while True:
        data = None
        for attempt in range(max_retries):
            try:
                resp = requests.get(base_url, params=params, timeout=10)
                resp.raise_for_status()
                data = resp.json()
                break
            except Exception as err:
                logging.warning(
                    "Erreur lors de l’appel API YouTube (playlistItems): %s", err
                )
                if attempt == max_retries - 1:
                    return items
                time.sleep(backoff)
                backoff = min(backoff * 2, 60)

        items.extend(data.get("items", []))
        next_page_token = data.get("nextPageToken")
        if not next_page_token:
            break
        params["pageToken"] = next_page_token
    return items


def fetch_videos_details(video_ids, api_key, max_retries=5):
    """Récupère les détails de plusieurs vidéos en une seule requête API."""
    base_url = "https://www.googleapis.com/youtube/v3/videos"
    details = {}
    for i in range(0, len(video_ids), 50):
        batch = video_ids[i : i + 50]
        params = {
            "part": "snippet,contentDetails,statistics",
            "id": ",".join(batch),
            "key": api_key,
        }
        backoff = 1
        data = {}
        for attempt in range(max_retries):
            try:
                resp = requests.get(base_url, params=params, timeout=10)
                resp.raise_for_status()
                data = resp.json()
                break
            except Exception as err:
                logging.warning(
                    "Erreur lors de l’appel API YouTube (videos): %s", err
                )
                if attempt == max_retries - 1:
                    data = {}
                    break
                time.sleep(backoff)
                backoff = min(backoff * 2, 60)
        for item in data.get("items", []):
            details[item["id"]] = item
    return details

def get_thumbnail_url(video_data):
    """Extrait l’URL de miniature la plus grande disponible."""
    thumb_info = video_data.get("snippet", {}).get("thumbnails", {})
    for quality in ["high", "standard", "medium", "default"]:
        if quality in thumb_info:
            return thumb_info[quality]["url"]
    return DEFAULT_THUMBNAIL_URL

def format_published_at(iso_timestamp):
    """Formate la date de publication ISO en 'dd/mm/YYYY HH:MM' (préfixée d'une apostrophe)."""
    try:
        dt = datetime.strptime(iso_timestamp, "%Y-%m-%dT%H:%M:%SZ")
    except ValueError:
        return ""
    return f"'{dt.strftime('%d/%m/%Y %H:%M')}"

# Cache d’avatars de chaîne (évite de refaire des requêtes)
channel_avatar_cache = {}

def get_channel_avatar(channel_id, api_key):
    """Retourne l'URL de l'avatar de chaîne.

    Utilise un cache et gère les erreurs réseau. L'API key est passée en
    paramètre pour éviter l'utilisation d'une variable globale.
    """
    if channel_id in channel_avatar_cache:
        return channel_avatar_cache[channel_id]

    channel_url = (
        "https://www.googleapis.com/youtube/v3/channels"
        f"?part=snippet&id={channel_id}&key={api_key}"
    )
    try:
        response = requests.get(channel_url, timeout=10)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        logging.error(
            f"Erreur lors de la récupération de l'avatar pour la chaîne {channel_id}: {e}"
        )
        data = {}

    avatar_url = DEFAULT_AVATAR_URL
    if data.get("items"):
        thumbs = data["items"][0].get("snippet", {}).get("thumbnails", {})
        avatar_url = thumbs.get("default", {}).get("url", DEFAULT_AVATAR_URL)

    channel_avatar_cache[channel_id] = avatar_url
    return avatar_url

def add_video_to_categories(entry, duration_category, videos_by_category, all_videos):
    """Ajoute une entrée vidéo à la catégorie correspondante et à la liste globale."""
    videos_by_category[duration_category].append(entry)
    all_videos.append(entry)

def sync_videos():
    """
    Récupère les vidéos d’une playlist YouTube et met à jour un Google Sheet.
    Regroupe par catégorie de durée.
    """
    # On lit les clés/identifiants dans les variables d’environnement
    YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")
    SPREADSHEET_ID = os.environ.get("SPREADSHEET_ID")
    if not YOUTUBE_API_KEY:
        logging.error("Variable d'environnement YOUTUBE_API_KEY manquante")
        return
    if not SPREADSHEET_ID:
        logging.error("Variable d'environnement SPREADSHEET_ID manquante")
        return
    SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
    SERVICE_ACCOUNT_FILE = "service_account.json"

    # Authentification Google Sheets
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES
    )
    service = build("sheets", "v4", credentials=creds)

    # ID de la playlist à synchroniser
    PLAYLIST_ID = "PLtBV_WamBQbAxyF88DPxAPxFwceTjsP9vR"

    items = fetch_all_playlist_items(PLAYLIST_ID, YOUTUBE_API_KEY)
    video_ids = [item["contentDetails"]["videoId"] for item in items]
    videos_data = fetch_videos_details(video_ids, YOUTUBE_API_KEY)

    # Catégories de durée
    videos_by_category = {
        "0-5min": [],
        "5-10min": [],
        "10-20min": [],
        "20-30min": [],
        "30-40min": [],
        "40-50min": [],
        "50-60min": [],
        "60Plusmin": [],
        "Inconnue": [],
    }
    all_videos = []

    for item in items:
        video_id = item["contentDetails"]["videoId"]
        video_link = f"https://www.youtube.com/watch?v={video_id}"

        info = videos_data.get(video_id, {})
        if info:
            snippet = info.get("snippet", {})
            stats = info.get("statistics", {})

            title = snippet.get("title", "Inconnu")
            channel = snippet.get("channelTitle", "Inconnu")
            channel_id = snippet.get("channelId", "")
            duration_iso = info.get("contentDetails", {}).get("duration", "PT0S")
            video_duration = parse_duration(duration_iso)
            thumbnail_url = get_thumbnail_url(info)
            avatar_url = get_channel_avatar(channel_id, YOUTUBE_API_KEY)

            view_count = stats.get("viewCount", "N/A")
            like_count = stats.get("likeCount", "N/A")
            comment_count = stats.get("commentCount", "N/A")

            short_description = snippet.get("description", "")
            tags_str = ", ".join(snippet.get("tags", []))
            published_at_formatted = format_published_at(
                snippet.get("publishedAt", "")
            )

            thumbnail_formula = thumbnail_url
        else:
            # Valeurs par défaut si l’API ne renvoie rien
            title = "Inconnu"
            channel = "Inconnu"
            channel_id = ""
            video_duration = "Inconnue"
            published_at_formatted = ""
            thumbnail_formula = DEFAULT_THUMBNAIL_URL
            avatar_url = DEFAULT_AVATAR_URL
            view_count = "N/A"
            like_count = "N/A"
            comment_count = "N/A"
            short_description = ""
            tags_str = ""

        duration_category = get_duration_category(video_duration)
        entry = [
            avatar_url,
            title,
            video_link,
            channel,
            published_at_formatted,
            video_duration,
            view_count,
            like_count,
            comment_count,
            short_description,
            tags_str,
            duration_category,
            thumbnail_formula,
        ]
        add_video_to_categories(entry, duration_category, videos_by_category, all_videos)

    # À ce stade, on dispose de la liste complète all_videos.
    # Il reste à écrire ces données dans le Google Sheet,
    # en créant l’onglet s’il n’existe pas et en remplaçant les valeurs existantes.
    # Cette logique peut rester inchangée par rapport à votre implémentation actuelle.
    # Exemple succinct :
    sheet_name = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    sheet_id = get_sheet_id(SPREADSHEET_ID, sheet_name, service)
    if sheet_id is None:
        # Ajout d’une nouvelle feuille
        requests_body = {
            "requests": [
                {
                    "addSheet": {
                        "properties": {
                            "title": sheet_name,
                        }
                    }
                }
            ]
        }
        service.spreadsheets().batchUpdate(
            spreadsheetId=SPREADSHEET_ID, body=requests_body
        ).execute()
        sheet_id = get_sheet_id(SPREADSHEET_ID, sheet_name, service)

    # Préparation des données (en-tête + lignes)
    values = [HEADERS]
    values.extend(all_videos)

    body = {"values": values}
    # Effacement du contenu existant et insertion des nouvelles valeurs
    range_name = f"{sheet_name}!A1"
    service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range=range_name,
        valueInputOption="RAW",
        body=body,
    ).execute()
    logging.info("Synchronisation terminée : %d vidéos mises à jour.", len(all_videos))

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    sync_videos()
