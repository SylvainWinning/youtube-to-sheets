import os
import requests
import re
from datetime import datetime
from google.oauth2 import service_account
from googleapiclient.discovery import build

def parse_duration(iso_duration):
    # Exemple de iso_duration : "PT4M13S"
    pattern = re.compile(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?')
    match = pattern.match(iso_duration)
    hours = int(match.group(1)) if match.group(1) else 0
    minutes = int(match.group(2)) if match.group(2) else 0
    seconds = int(match.group(3)) if match.group(3) else 0

    # Formater la durée en HH:MM:SS si heures présentes, sinon MM:SS
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    else:
        return f"{minutes:02d}:{seconds:02d}"

def get_duration_category(duration):
    # Convertir la durée en secondes
    parts = duration.split(":")
    if len(parts) == 2:  # Format MM:SS
        total_seconds = int(parts[0]) * 60 + int(parts[1])
    elif len(parts) == 3:  # Format HH:MM:SS
        total_seconds = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    else:
        return "Inconnue"

    # Catégoriser par plage
    if total_seconds <= 300:
        return "0-5min"
    elif total_seconds <= 600:
        return "5-10min"
    elif total_seconds <= 1200:
        return "10-20min"
    else:
        return "20+min"

def get_sheet_id(spreadsheet_id, sheet_title, service):
    spreadsheet = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    for sheet in spreadsheet.get("sheets", []):
        if sheet["properties"]["title"] == sheet_title:
            return sheet["properties"]["sheetId"]
    return None

YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")
SPREADSHEET_ID = os.environ.get("SPREADSHEET_ID")

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
SERVICE_ACCOUNT_FILE = 'service_account.json'
creds = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
service = build('sheets', 'v4', credentials=creds)

PLAYLIST_ID = "PLtBV_WamBQbAxyF08PXaPxfFwcTejP9vR"
YT_PLAYLIST_API_URL = (
    f"https://www.googleapis.com/youtube/v3/playlistItems"
    f"?part=snippet%2CcontentDetails&playlistId={PLAYLIST_ID}&maxResults=50&key={YOUTUBE_API_KEY}"
)

response = requests.get(YT_PLAYLIST_API_URL)
data = response.json()

videos_by_category = {
    "0-5min": [],
    "5-10min": [],
    "10-20min": [],
    "20+min": []
}

for item in data.get('items', []):
    title = item['snippet']['title']
    video_id = item['contentDetails']['videoId']
    published_at = item['snippet']['publishedAt']

    dt = datetime.strptime(published_at, "%Y-%m-%dT%H:%M:%SZ")
    published_at_formatted = dt.strftime("%d/%m/%Y %H:%M:%S")

    video_link = f"https://www.youtube.com/watch?v={video_id}"

    # Nouvel appel pour récupérer les infos de la vidéo (snippet+contentDetails)
    YT_VIDEO_API_URL = (
        f"https://www.googleapis.com/youtube/v3/videos"
        f"?part=snippet,contentDetails&id={video_id}&key={YOUTUBE_API_KEY}"
    )
    video_response = requests.get(YT_VIDEO_API_URL)
    video_data = video_response.json()

    if 'items' in video_data and len(video_data['items']) > 0:
        channel = video_data['items'][0]['snippet']['channelTitle']
        duration_iso = video_data['items'][0]['contentDetails']['duration']
        video_duration = parse_duration(duration_iso)
    else:
        channel = "Inconnu"
        video_duration = "Inconnue"

    # Déterminer la catégorie de durée
    category = get_duration_category(video_duration)
    
    # Ajouter la vidéo dans la bonne catégorie
    videos_by_category[category].append([title, video_link, channel, published_at_formatted, video_duration])

# Écrire les vidéos dans les onglets correspondants
for category, videos in videos_by_category.items():
    RANGE_NAME = f"'{category}'!A2:E"

    # Créer un onglet s'il n'existe pas
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
    except Exception as e:
        print(f"L'onglet {category} existe probablement déjà : {e}")

    # Récupérer l'ID de l'onglet
    sheet_id = get_sheet_id(SPREADSHEET_ID, category, service)

    # Ajouter les vidéos dans l'onglet
    body = {
        'values': videos
    }

    service.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range=RANGE_NAME,
        valueInputOption='RAW',
        body=body
    ).execute()

    # Ajouter des bordures pour le tableau
    num_rows = len(videos)
    if num_rows > 0 and sheet_id is not None:
        service.spreadsheets().batchUpdate(
            spreadsheetId=SPREADSHEET_ID,
            body={
                "requests": [
                    {
                        "updateBorders": {
                            "range": {
                                "sheetId": sheet_id,
                                "startRowIndex": 1,       # A partir de la ligne 2
                                "endRowIndex": 1 + num_rows,
                                "startColumnIndex": 0,    # A=0
                                "endColumnIndex": 5       # A-E
                            },
                            "top": {
                                "style": "SOLID",
                                "width": 1,
                                "color": {"red": 0, "green": 0, "blue": 0}
                            },
                            "bottom": {
                                "style": "SOLID",
                                "width": 1,
                                "color": {"red": 0, "green": 0, "blue": 0}
                            },
                            "left": {
                                "style": "SOLID",
                                "width": 1,
                                "color": {"red": 0, "green": 0, "blue": 0}
                            },
                            "right": {
                                "style": "SOLID",
                                "width": 1,
                                "color": {"red": 0, "green": 0, "blue": 0}
                            },
                            "innerHorizontal": {
                                "style": "SOLID",
                                "width": 1,
                                "color": {"red": 0, "green": 0, "blue": 0}
                            },
                            "innerVertical": {
                                "style": "SOLID",
                                "width": 1,
                                "color": {"red": 0, "green": 0, "blue": 0}
                            }
                        }
                    }
                ]
            }
        ).execute()

print("Vidéos classées par durée dans les onglets correspondants avec bordures ajoutées.")
