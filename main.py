import os

# Récupérer les variables d'environnement
youtube_api_key = os.environ.get("YOUTUBE_API_KEY")
spreadsheet_id = os.environ.get("SPREADSHEET_ID")

# Pour le moment, affichons simplement ces valeurs
print("YouTube API Key:", youtube_api_key)
print("Spreadsheet ID:", spreadsheet_id)
print("Script main.py exécuté avec succès !")
