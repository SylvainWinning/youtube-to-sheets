import os
import requests
import re
import random
import time
import logging
from datetime import datetime
from google.oauth2 import service_account
from googleapiclient.discovery import build

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
    # Regex pour extraire heures, minutes et secondes
    pattern = re.compile(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?')
    match = pattern.match(iso_duration)
    if not match:
        return "Inconnue"
    h = int(match.group(1)) if match.group(1) else 0
    m = int(match.group(2)) if match.group(2) else 0
    s = int(match.group(3)) if match.group(3) else 0
    return f"{h:02d}:{m:02d}:{s:02d}"

def get_duration_category(duration):
    """
    Classe la durée dans une catégorie en fonction du total de secondes.
    La durée est attendue au format "HH:MM:SS".
    """
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

    def fetch_page():
        backoff = 1
        while True:
            try:
                response = requests.get(base_url, params=params)
                if response.status_code != 200:
                    raise requests.RequestException(f"HTTP {response.status_code}")
                return response.json()
            except Exception as err:
                logging.warning("Erreur lors de la récupération de la playlist: %s", err)
                time.sleep(backoff)
                backoff = min(backoff * 2, 60)

    all_items = []
    last_page_token = None
    while True:
        data = fetch_page()
        all_items.extend(data.get('items', []))
        if 'nextPageToken' in data:
            last_page_token = data['nextPageToken']
            params["pageToken"] = last_page_token
        else:
            break

    playlist_resp = requests.get(
        "https://www.googleapis.com/youtube/v3/playlists",
        params={"part": "contentDetails", "id": playlist_id, "key": api_key},
    )
    total_items = (
        playlist_resp.json().get("items", [{}])[0]
        .get("contentDetails", {})
        .get("itemCount", 0)
    )

    if len(all_items) < total_items and last_page_token:
        logging.warning(
            "Nombre d'éléments incomplet (%d/%d), relance depuis le dernier pageToken",
            len(all_items),
            total_items,
        )
        params["pageToken"] = last_page_token
        while len(all_items) < total_items:
            data = fetch_page()
            all_items.extend(data.get('items', []))
            if 'nextPageToken' in data:
                params["pageToken"] = data["nextPageToken"]
            else:
                break

    return all_items

def get_thumbnail_url(video_data):
    thumb_info = video_data['items'][0]['snippet'].get('thumbnails', {})
    for quality in ['high', 'standard', 'medium', 'default']:
        if quality in thumb_info:
            return thumb_info[quality]['url']
    return DEFAULT_THUMBNAIL_URL


def format_published_at(iso_timestamp):
    dt = datetime.strptime(iso_timestamp, "%Y-%m-%dT%H:%M:%SZ")
    return f"'{dt.strftime('%d/%m/%Y %H:%M')}"

def sync_videos():
    YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")
    SPREADSHEET_ID = os.environ.get("SPREADSHEET_ID")

    SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
    SERVICE_ACCOUNT_FILE = 'service_account.json'
    creds = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    service = build('sheets', 'v4', credentials=creds)

    PLAYLIST_ID = "PLtBV_WamBQbAxyF08PXaPxfFwcTejP9vR"
    items = fetch_all_playlist_items(PLAYLIST_ID, YOUTUBE_API_KEY)

    # Dictionnaire pour classer les vidéos par durée
    videos_by_category = {
        "0-5min": [],
        "5-10min": [],
        "10-20min": [],
        "20-30min": [],
        "30-40min": [],
        "40-50min": [],
        "50-60min": [],
        "60Plusmin": [],
        "Inconnue": []
    }

    channel_avatar_cache = {}

    def get_channel_avatar(channel_id):
        if channel_id in channel_avatar_cache:
            return channel_avatar_cache[channel_id]
        channel_url = (
            "https://www.googleapis.com/youtube/v3/channels"
            f"?part=snippet&id={channel_id}&key={YOUTUBE_API_KEY}"
        )
        response = requests.get(channel_url)
        data = response.json()
        avatar_url = DEFAULT_AVATAR_URL
        if "items" in data and data["items"]:
            thumbs = data["items"][0]["snippet"].get("thumbnails", {})
            avatar_url = thumbs.get("default", {}).get("url", DEFAULT_AVATAR_URL)
        channel_avatar_cache[channel_id] = avatar_url
        return avatar_url

    for item in items:
        video_id = item['contentDetails']['videoId']
        video_link = f"https://www.youtube.com/watch?v={video_id}"

        YT_VIDEO_API_URL = (
            f"https://www.googleapis.com/youtube/v3/videos"
            f"?part=snippet,contentDetails,statistics&id={video_id}&key={YOUTUBE_API_KEY}"
        )
        video_response = requests.get(YT_VIDEO_API_URL)
        video_data = video_response.json()

        if 'items' in video_data and len(video_data['items']) > 0:
            snippet = video_data['items'][0]['snippet']
            stats = video_data['items'][0].get('statistics', {})
            title = snippet['title']
            channel = snippet['channelTitle']
            channel_id = snippet.get('channelId', '')
            # Récupération sécurisée de la durée
            content_details = video_data['items'][0].get('contentDetails', {})
            duration_iso = content_details.get('duration', "PT0S")
            video_duration = parse_duration(duration_iso)
            thumbnail_url = get_thumbnail_url(video_data)
            avatar_url = get_channel_avatar(channel_id)

            view_count = stats.get('viewCount', 'N/A')
            like_count = stats.get('likeCount', 'N/A')
            comment_count = stats.get('commentCount', 'N/A')

            # On ne tronque plus la description
            short_description = snippet.get('description', '')

            tags = snippet.get('tags', [])
            tags_str = ", ".join(tags)

            original_published_at = snippet['publishedAt']
            # On préfixe la date d'une apostrophe pour l'afficher au format
            # "07/01/2025 12:34" et éviter la conversion automatique de Google
            # Sheets
            published_at_formatted = format_published_at(original_published_at)
            
            # Affichage uniquement de l'URL brute de la miniature
            thumbnail_formula = thumbnail_url
        else:
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
        videos_by_category[duration_category].append([
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
        ])

    # Titres des colonnes
    headers = HEADERS

    for category, videos in videos_by_category.items():
        # Mélange aléatoire des vidéos dans la catégorie
        random.shuffle(videos)

        last_col = chr(ord('A') + len(headers) - 1)
        RANGE_NAME_DATA = f"'{category}'!A2:{last_col}"
        RANGE_NAME_HEADERS = f"'{category}'!A1:{last_col}1"

        # Création de la feuille si elle n'existe pas déjà
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

        # Insertion des en-têtes
        service.spreadsheets().values().update(
            spreadsheetId=SPREADSHEET_ID,
            range=RANGE_NAME_HEADERS,
            valueInputOption='USER_ENTERED',
            body={'values': [headers]}
        ).execute()

        # Efface la plage de données pour éviter la présence de vidéos obsolètes
        service.spreadsheets().values().clear(
            spreadsheetId=SPREADSHEET_ID,
            range=RANGE_NAME_DATA
        ).execute()

        # Insertion des vidéos
        service.spreadsheets().values().update(
            spreadsheetId=SPREADSHEET_ID,
            range=RANGE_NAME_DATA,
            valueInputOption='USER_ENTERED',
            body={'values': videos}
        ).execute()

        # Mise en gras des en-têtes
        bold_request = {
            "requests": [
                {
                    "repeatCell": {
                        "range": {
                            "sheetId": sheet_id,
                            "startRowIndex": 0,
                            "endRowIndex": 1,
                            "startColumnIndex": 0,
                            "endColumnIndex": len(headers)
                        },
                        "cell": {
                            "userEnteredFormat": {
                                "textFormat": {
                                    "bold": True
                                }
                            }
                        },
                        "fields": "userEnteredFormat.textFormat.bold"
                    }
                }
            ]
        }
        service.spreadsheets().batchUpdate(
            spreadsheetId=SPREADSHEET_ID,
            body=bold_request
        ).execute()

        # Activation du wrapping pour éviter la troncature visuelle
        wrap_request = {
            "requests": [
                {
                    "repeatCell": {
                        "range": {
                            "sheetId": sheet_id
                        },
                        "cell": {
                            "userEnteredFormat": {
                                "wrapStrategy": "WRAP"
                            }
                        },
                        "fields": "userEnteredFormat.wrapStrategy"
                    }
                }
            ]
        }
        service.spreadsheets().batchUpdate(
            spreadsheetId=SPREADSHEET_ID,
            body=wrap_request
        ).execute()

        # Auto-redimensionnement des colonnes
        auto_resize_request = {
            "requests": [
                {
                    "autoResizeDimensions": {
                        "dimensions": {
                            "sheetId": sheet_id,
                            "dimension": "COLUMNS",
                            "startIndex": 0,
                            "endIndex": len(headers)
                        }
                    }
                }
            ]
        }
        service.spreadsheets().batchUpdate(
            spreadsheetId=SPREADSHEET_ID,
            body=auto_resize_request
        ).execute()

    print("Synchronisation terminée. Les vidéos, les titres en gras, sans troncature et avec wrapping sont ajoutés.")

if __name__ == "__main__":
    # Exécution unique de la synchronisation
    sync_videos()
