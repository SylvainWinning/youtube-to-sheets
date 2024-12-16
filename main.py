import os
import requests
import re
import time
from datetime import datetime
from google.oauth2 import service_account
from googleapiclient.discovery import build

def parse_duration(iso_duration):
    # Convertit une durée ISO 8601 (ex: "PT4M13S", "PT1H2M3S") en format "MM:SS"
    pattern = re.compile(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?')
    match = pattern.match(iso_duration)
    hours = int(match.group(1)) if match and match.group(1) else 0
    minutes = int(match.group(2)) if match and match.group(2) else 0
    seconds = int(match.group(3)) if match and match.group(3) else 0

    total_seconds = hours * 3600 + minutes * 60 + seconds
    total_minutes = total_seconds // 60
    remaining_seconds = total_seconds % 60

    return f"{total_minutes}:{remaining_seconds:02d}"

def get_duration_category(duration):
    # Classe la vidéo selon sa durée, durée au format "MM:SS"
    parts = duration.split(":")
    if len(parts) != 2:
        return "Inconnue"
    try:
        total_minutes = int(parts[0])
        total_seconds = total_minutes * 60 + int(parts[1])
    except ValueError:
        return "Inconnue"

    if total_seconds <= 300:       # <=5min
        return "0-5min"
    elif total_seconds <= 600:     # <=10min
        return "5-10min"
    elif total_seconds <= 1200:    # <=20min
        return "10-20min"
    elif total_seconds <= 1800:    # <=30min
        return "20-30min"
    elif total_seconds <= 2400:    # <=40min
        return "30-40min"
    elif total_seconds <= 3000:    # <=50min
        return "40-50min"
    elif total_seconds <= 3600:    # <=60min
        return "50-60min"
    else:
        return "60+min"

def get_sheet_id(spreadsheet_id, sheet_title, service):
    # Récupère l'ID interne d'un onglet en fonction de son titre
    spreadsheet = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    for sheet in spreadsheet.get("sheets", []):
        if sheet["properties"]["title"] == sheet_title:
            return sheet["properties"]["sheetId"]
    return None

def fetch_all_playlist_items(playlist_id, api_key):
    # Récupère tous les items d'une playlist (tous les résultats paginés)
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

def sync_videos():
    # Variables d'environnement
    YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")
    SPREADSHEET_ID = os.environ.get("SPREADSHEET_ID")

    # Authentification Sheets API
    SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
    SERVICE_ACCOUNT_FILE = 'service_account.json'
    creds = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    service = build('sheets', 'v4', credentials=creds)

    # ID de la playlist
    PLAYLIST_ID = "PLtBV_WamBQbAxyF08PXaPxfFwcTejP9vR"

    # Récupération des items de la playlist
    items = fetch_all_playlist_items(PLAYLIST_ID, YOUTUBE_API_KEY)

    # Catégories de durées
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
        title = item['snippet']['title']
        video_id = item['contentDetails']['videoId']
        published_at = item['snippet']['publishedAt']

        # Formatage de la date (sans heure)
        dt = datetime.strptime(published_at, "%Y-%m-%dT%H:%M:%SZ")
        published_at_formatted = dt.strftime("%d/%m/%Y")

        video_link = f"https://www.youtube.com/watch?v={video_id}"

        # Récupérer les détails de la vidéo (durée, chaîne)
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

            # Utilisation de l'URL fixe de la miniature YouTube
            thumbnail_url = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
            thumbnail_formula = f'=IMAGE("{thumbnail_url}")'
        else:
            channel = "Inconnu"
            video_duration = "Inconnue"
            thumbnail_formula = ""

        # Déterminer la catégorie de durée
        category = get_duration_category(video_duration)

        # Colonnes : A=Miniature, B=Titre, C=Lien, D=Chaîne, E=Date, F=Durée
        videos_by_category[category].append([
            thumbnail_formula,
            title,
            video_link,
            channel,
            published_at_formatted,
            video_duration
        ])

    # Mise à jour de chaque onglet
    for category, videos in videos_by_category.items():
        RANGE_NAME = f"'{category}'!A2:F"

        # Créer l'onglet s'il n'existe pas
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
        except:
            # L'onglet existe déjà, on ignore l'erreur
            pass

        sheet_id = get_sheet_id(SPREADSHEET_ID, category, service)

        # Mise à jour des données dans l'onglet
        body = {'values': videos}
        service.spreadsheets().values().update(
            spreadsheetId=SPREADSHEET_ID,
            range=RANGE_NAME,
            valueInputOption='USER_ENTERED',  # Pour que la formule =IMAGE() soit interprétée
            body=body
        ).execute()

        # Application des bordures et dimensionnement si des vidéos sont présentes
        num_rows = len(videos)
        if num_rows > 0 and sheet_id is not None:
            batch_requests = [
                {
                    "updateBorders": {
                        "range": {
                            "sheetId": sheet_id,
                            "startRowIndex": 1,       # A partir de la ligne 2
                            "endRowIndex": 1 + num_rows,
                            "startColumnIndex": 0,    # A=0
                            "endColumnIndex": 6       # F=5, endColumnIndex=6 car non inclusif
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
                },
                # Ajuster la hauteur des lignes à 200px
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
                # Ajuster la largeur de la colonne A (miniature) à 200px
                {
                    "updateDimensionProperties": {
                        "range": {
                            "sheetId": sheet_id,
                            "dimension": "COLUMNS",
                            "startIndex": 0,  # Colonne A
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

    print("Synchronisation terminée. Les miniatures devraient désormais s'afficher correctement.")

# Boucle pour une synchronisation toutes les heures
while True:
    sync_videos()
    time.sleep(3600)  # Attendre une heure avant la prochaine synchronisation
