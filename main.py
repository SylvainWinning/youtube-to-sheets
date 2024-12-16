import os
import requests
import re
import time
import random
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
            duration_iso = video_data['items'][0]['contentDetails']['duration']
            video_duration = parse_duration(duration_iso)
            thumbnail_url = get_thumbnail_url(video_data)

            view_count = stats.get('viewCount', 'N/A')
            like_count = stats.get('likeCount', 'N/A')
            comment_count = stats.get('commentCount', 'N/A')

            short_description = snippet.get('description', '')
            if len(short_description) > 100:
                short_description = short_description[:100] + '...'

            tags = snippet.get('tags', [])
            tags_str = ", ".join(tags)

            original_published_at = snippet['publishedAt']
            dt = datetime.strptime(original_published_at, "%Y-%m-%dT%H:%M:%SZ")
            published_at_formatted = dt.strftime("%d/%m/%Y")

            thumbnail_formula = f'=IMAGE("{thumbnail_url}")' if thumbnail_url else ""
        else:
            title = "Inconnu"
            channel = "Inconnu"
            video_duration = "Inconnue"
            published_at_formatted = ""
            thumbnail_formula = ""
            view_count = "N/A"
            like_count = "N/A"
            comment_count = "N/A"
            short_description = ""
            tags_str = ""

        category = get_duration_category(video_duration)
        videos_by_category[category].append([
            thumbnail_formula,
            title,
            video_link,
            channel,
            published_at_formatted,
            video_duration,
            view_count,
            like_count,
            comment_count,
            short_description,
            tags_str
        ])

    # Titres des colonnes
    headers = [
        "Miniature", "Titre", "Lien", "Chaîne", "Publié le", "Durée",
        "Vues", "J'aime", "Commentaires", "Description courte", "Tags"
    ]

    for category, videos in videos_by_category.items():
        # Mélange aléatoire des vidéos de la catégorie
        random.shuffle(videos)

        RANGE_NAME_DATA = f"'{category}'!A2:K"
        RANGE_NAME_HEADERS = f"'{category}'!A1:K1"

        # Création de la feuille si elle n’existe pas
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

        # Rendre les en-têtes en gras
        bold_request = {
            "requests": [
                {
                    "repeatCell": {
                        "range": {
                            "sheetId": sheet_id,
                            "startRowIndex": 0,
                            "endRowIndex": 1,
                            "startColumnIndex": 0,
                            "endColumnIndex": 11
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

        # Insertion des vidéos
        body = {'values': videos}
        service.spreadsheets().values().update(
            spreadsheetId=SPREADSHEET_ID,
            range=RANGE_NAME_DATA,
            valueInputOption='USER_ENTERED',
            body=body
        ).execute()

        num_rows = len(videos)
        if num_rows > 0 and sheet_id is not None:
            batch_requests = [
                {
                    "updateBorders": {
                        "range": {
                            "sheetId": sheet_id,
                            "startRowIndex": 1,
                            "endRowIndex": 1 + num_rows,
                            "startColumnIndex": 0,
                            "endColumnIndex": 11
                        },
                        "top": {"style": "SOLID", "width": 1, "color": {"red": 0, "green": 0, "blue": 0}},
                        "bottom": {"style": "SOLID", "width": 1, "color": {"red": 0, "green": 0, "blue": 0}},
                        "left": {"style": "SOLID", "width": 1, "color": {"red": 0, "green": 0, "blue": 0}},
                        "right": {"style": "SOLID", "width": 1, "color": {"red": 0, "green": 0, "blue": 0}},
                        "innerHorizontal": {"style": "SOLID", "width": 1, "color": {"red": 0, "green": 0, "blue": 0}},
                        "innerVertical": {"style": "SOLID", "width": 1, "color": {"red": 0, "green": 0, "blue": 0}}
                    }
                },
                {
                    "updateDimensionProperties": {
                        "range": {
                            "sheetId": sheet_id,
                            "dimension": "ROWS",
                            "startIndex": 1,
                            "endIndex": 1 + num_rows
                        },
                        "properties": {
                            "pixelSize": 200
                        },
                        "fields": "pixelSize"
                    }
                },
                {
                    "updateDimensionProperties": {
                        "range": {
                            "sheetId": sheet_id,
                            "dimension": "COLUMNS",
                            "startIndex": 0,
                            "endIndex": 1
                        },
                        "properties": {
                            "pixelSize": 200
                        },
                        "fields": "pixelSize"
                    }
                }
            ]

            service.spreadsheets().batchUpdate(
                spreadsheetId=SPREADSHEET_ID,
                body={"requests": batch_requests}
            ).execute()

    print("Synchronisation terminée. Les vidéos, les titres en gras et la mise en forme ont été ajoutés.")

while True:
    sync_videos()
    time.sleep(3600)
