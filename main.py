import os
import re
import time
import logging
import json
from datetime import datetime

import requests
from google.oauth2 import service_account
from googleapiclient.discovery import build

# Colonnes attendues pour l’export CSV/Google Sheets
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

_SPREADSHEET_RE = re.compile(r"/spreadsheets/d/([A-Za-z0-9-_]{25,60})")

def parse_spreadsheet_id(value: str) -> str | None:
    match = _SPREADSHEET_RE.search(value or "")
    if match:
        return match.group(1)
    if re.fullmatch(r"[A-Za-z0-9-_]{25,60}", value or ""):
        return value.strip()
    return None

def parse_duration(iso_duration: str) -> str:
    """Convertit une durée ISO 8601 (ex. 'PT5M20S') en 'HH:MM:SS'."""
    pattern = re.compile(r"^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$")
    match = pattern.match(iso_duration or "")
    if not match:
        return "Inconnue"
    h = int(match.group(1)) if match.group(1) else 0
    m = int(match.group(2)) if match.group(2) else 0
    s = int(match.group(3)) if match.group(3) else 0
    return f"{h:02d}:{m:02d}:{s:02d}"

def get_duration_category(duration: str) -> str:
    """Classe la durée en catégories (0‑5 min, 5‑10 min, etc.)."""
    parts = (duration or "").split(":")
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

def get_sheet_id(spreadsheet_id: str, sheet_title: str, service) -> int | None:
    """Retourne l’ID de feuille correspondant au titre dans un Google Sheet."""
    spreadsheet = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    for sheet in spreadsheet.get("sheets", []):
        if sheet["properties"]["title"] == sheet_title:
            return sheet["properties"]["sheetId"]
    return None

def ensure_sheet_exists(service, spreadsheet_id: str, sheet_name: str) -> int:
    """Vérifie l’existence de l’onglet et le crée au besoin. Retourne le sheetId."""
    sheet_id = get_sheet_id(spreadsheet_id, sheet_name, service)
    if sheet_id is not None:
        return sheet_id
    requests_body = {"requests": [{"addSheet": {"properties": {"title": sheet_name}}}]}
    service.spreadsheets().batchUpdate(spreadsheetId=spreadsheet_id, body=requests_body).execute()
    sheet_id = get_sheet_id(spreadsheet_id, sheet_name, service)
    if sheet_id is None:
        raise RuntimeError(f"Impossible de créer l’onglet '{sheet_name}'.")
    return sheet_id

def fetch_all_playlist_items(source_id: str, api_key: str, max_retries: int = 5) -> list[dict]:
    """
    Récupère tous les items d’une playlist YouTube en gérant la pagination,
    avec gestion d’erreurs réseau et backoff exponentiel.

    Lève RuntimeError si toutes les tentatives pour récupérer une page échouent.
    """
    base_url = "https://www.googleapis.com/youtube/v3/playlistItems"
    params = {
        "part": "snippet,contentDetails",
        "playlistId": source_id,
        "maxResults": 50,
        "key": api_key,
    }
    items: list[dict] = []
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
                logging.warning("Erreur API YouTube (playlistItems): %s", err)
                if attempt == max_retries - 1:
                    logging.error(
                        "Toutes les tentatives (%s) ont échoué pour récupérer les items de la playlist.",
                        max_retries,
                    )
                    raise RuntimeError("Échec de récupération des items de la playlist") from err
                time.sleep(backoff)
                backoff = min(backoff * 2, 60)
        items.extend(data.get("items", []))
        next_page_token = data.get("nextPageToken")
        if not next_page_token:
            break
        params["pageToken"] = next_page_token
    return items

def fetch_videos_details(video_ids: list[str], api_key: str, max_retries: int = 5) -> dict[str, dict]:
    """Récupère les détails de plusieurs vidéos en une seule requête API."""
    base_url = "https://www.googleapis.com/youtube/v3/videos"
    details: dict[str, dict] = {}
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
                logging.warning("Erreur API YouTube (videos): %s", err)
                if attempt == max_retries - 1:
                    data = {}
                    break
                time.sleep(backoff)
                backoff = min(backoff * 2, 60)
        for item in data.get("items", []):
            details[item["id"]] = item
    return details

def get_thumbnail_url(video_data: dict) -> str:
    """Extrait l’URL de miniature la plus grande disponible."""
    thumb_info = video_data.get("snippet", {}).get("thumbnails", {})
    for quality in ["high", "standard", "medium", "default"]:
        if quality in thumb_info:
            return thumb_info[quality]["url"]
    return DEFAULT_THUMBNAIL_URL

def format_published_at(iso_timestamp: str) -> str:
    """Formate la date de publication ISO en 'dd/mm/YYYY HH:MM' (préfixée d'une apostrophe)."""
    try:
        dt = datetime.strptime(iso_timestamp or "", "%Y-%m-%dT%H:%M:%SZ")
    except ValueError:
        return ""
    return f"'{dt.strftime('%d/%m/%Y %H:%M')}"

# Cache d’avatars de chaîne (évite de refaire des requêtes)
channel_avatar_cache: dict[str, str] = {}

def get_channel_avatar(channel_id: str, api_key: str) -> str:
    """Retourne l'URL de l'avatar de chaîne (avec cache et gestion d’erreurs)."""
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
        logging.error("Erreur lors de la récupération de l'avatar pour la chaîne %s: %s", channel_id, e)
        data = {}
    avatar_url = DEFAULT_AVATAR_URL
    if data.get("items"):
        thumbs = data["items"][0].get("snippet", {}).get("thumbnails", {})
        avatar_url = thumbs.get("default", {}).get("url", DEFAULT_AVATAR_URL)
    channel_avatar_cache[channel_id] = avatar_url
    return avatar_url

def add_video_to_categories(entry: list, duration_category: str, videos_by_category: dict[str, list], all_videos: list) -> None:
    """Ajoute une entrée vidéo à la catégorie correspondante et à la liste globale."""
    videos_by_category[duration_category].append(entry)
    all_videos.append(entry)

def sync_videos() -> None:
    """
    Récupère les vidéos d’une playlist YouTube et met à jour un Google Sheet.
    Regroupe par catégorie de durée et alimente les onglets correspondants.
    """
    # Variables d’environnement
    YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")
    raw_spreadsheet_id = os.environ.get("SPREADSHEET_ID")
    playlist_source_id = os.environ.get("PLAYLIST_ID")
    SHEET_TAB_NAME = os.environ.get("SHEET_TAB_NAME", "AllVideos")
    if not playlist_source_id:
        logging.error("Variable d'environnement PLAYLIST_ID manquante")
        return
    if not raw_spreadsheet_id:
        logging.error("Variable d'environnement SPREADSHEET_ID manquante")
        return
    SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
    if not YOUTUBE_API_KEY:
        logging.error("Variable d'environnement YOUTUBE_API_KEY manquante")
        return
    SPREADSHEET_ID = parse_spreadsheet_id(raw_spreadsheet_id)
    if not SPREADSHEET_ID:
        logging.error("SPREADSHEET_ID invalide")
        return
    service_account_json_str = os.environ.get("SERVICE_ACCOUNT_JSON")
    if not service_account_json_str:
        logging.error("Variable d'environnement SERVICE_ACCOUNT_JSON manquante")
        return
    try:
        creds_info = json.loads(service_account_json_str)
        creds = service_account.Credentials.from_service_account_info(
            creds_info, scopes=SCOPES
        )
    except (ValueError, json.JSONDecodeError):
        logging.error("SERVICE_ACCOUNT_JSON invalide")
        return
    service = build("sheets", "v4", credentials=creds)
    # Récupération des vidéos
    try:
        items = fetch_all_playlist_items(playlist_source_id, YOUTUBE_API_KEY)
    except RuntimeError:
        # En cas d'erreur lors de la récupération, consigne un message générique
        logging.error("Impossible de récupérer les vidéos de la playlist")
        return
    if not items:
        logging.warning(
            "Aucun élément récupéré pour la playlist %s. Vérifiez l'identifiant ou la visibilité.",
            playlist_source_id,
        )
    video_ids = [it["contentDetails"]["videoId"] for it in items]
    videos_data = fetch_videos_details(video_ids, YOUTUBE_API_KEY)
    # Catégories et accumulations
    videos_by_category: dict[str, list] = {
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
    all_videos: list[list] = []
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
            published_at = format_published_at(snippet.get("publishedAt", ""))
            duration_category = get_duration_category(video_duration)
            entry = [
                avatar_url,
                title,
                video_link,
                channel,
                published_at,
                video_duration,
                stats.get("viewCount", "0"),
                stats.get("likeCount", "0"),
                stats.get("commentCount", "0"),
                snippet.get("description", "")[:50],
                ", ".join(snippet.get("tags", []) or []),
                snippet.get("categoryId", "Inconnue"),
                thumbnail_url,
            ]
            add_video_to_categories(entry, duration_category, videos_by_category, all_videos)
    # Prépare les données à écrire dans Google Sheets
    try:
        sheet_id = ensure_sheet_exists(service, SPREADSHEET_ID, SHEET_TAB_NAME)
    except RuntimeError as err:
        logging.error("%s", err)
        return
    # Effacer l'onglet avant d'écrire
    requests_body = {
        "requests": [
            {
                "updateCells": {
                    "range": {
                        "sheetId": sheet_id,
                    },
                    "fields": "*",
                }
            }
        ]
    }
    service.spreadsheets().batchUpdate(spreadsheetId=SPREADSHEET_ID, body=requests_body).execute()
    # Préparer les valeurs à écrire (en-tête + vidéos regroupées)
    values = [HEADERS]
    for category in videos_by_category:
        for video in videos_by_category[category]:
            values.append(video)
    body = {"values": values}
    service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range=f"{SHEET_TAB_NAME}!A1",
        valueInputOption="RAW",
        body=body,
    ).execute()


if __name__ == "__main__":
    sync_videos()
