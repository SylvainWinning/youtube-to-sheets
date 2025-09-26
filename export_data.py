#!/usr/bin/env python3
"""
Script utilitaire pour exporter les données de la feuille Google Sheets vers un
fichier JSON local. Ce script lit l'onglet « AllVideos » (qui contient toutes
les vidéos) et enregistre les valeurs dans `data/videos.json`. Le fichier
généré peut servir de jeu de données local pour l'application web lorsque
l'API Google Sheets n'est pas disponible ou lorsque les variables
d'environnement ne sont pas renseignées.

Le script utilise l'API Google Sheets publique (clé API) plutôt qu'un compte
service, ce qui permet un usage simple en lecture seule. La clé API et
l'identifiant du classeur sont récupérés depuis les variables
d'environnement `SPREADSHEET_ID` et `YOUTUBE_API_KEY`.

Usage :
    python export_data.py

Assurez‑vous que les variables d'environnement suivantes sont définies :
    - SPREADSHEET_ID : identifiant du Google Sheets (ou URL complète)
    - YOUTUBE_API_KEY : clé API Google permettant l'accès en lecture
"""

from __future__ import annotations

import os
import json
import pathlib
import re
import sys
import logging
from typing import List

import requests

# En-têtes attendues (doivent correspondre à celles utilisées dans main.py)
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
    "myCategory",
    "playlistPosition",
]

def parse_spreadsheet_id(value: str) -> str | None:
    """Extrait l'ID du classeur depuis une URL ou renvoie la chaîne brute."""
    pattern = re.compile(r"/spreadsheets/d/([A-Za-z0-9-_]{25,60})")
    match = pattern.search(value or "")
    if match:
        return match.group(1)
    if re.fullmatch(r"[A-Za-z0-9-_]{25,60}", value or ""):
        return value.strip()
    return None

def fetch_sheet_values(spreadsheet_id: str, api_key: str, range_: str) -> List[List[str]]:
    """
    Récupère les valeurs d'une plage dans une feuille Google Sheets via l'API.

    Args:
        spreadsheet_id: ID du classeur Google Sheets.
        api_key: Clé API Google.
        range_: Plage au format A1 (ex: 'AllVideos!A1:M').

    Returns:
        Liste de lignes (chaque ligne est une liste de chaînes). Si aucune valeur
        n'est trouvée, renvoie une liste vide.
    """
    encoded_range = requests.utils.quote(range_, safe="")
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{encoded_range}?key={api_key}"
    resp = requests.get(url, timeout=10)
    try:
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        logging.error("Erreur lors de la récupération des données de la feuille: %s", e)
        return []
    return data.get("values", [])

def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    raw_spreadsheet_id = os.environ.get("SPREADSHEET_ID", "")
    api_key = os.environ.get("YOUTUBE_API_KEY", "")

    # Validation des variables d'environnement
    if not raw_spreadsheet_id:
        logging.error("La variable d'environnement SPREADSHEET_ID est manquante.")
        return 1
    if not api_key:
        logging.error("La variable d'environnement YOUTUBE_API_KEY est manquante.")
        return 1
    spreadsheet_id = parse_spreadsheet_id(raw_spreadsheet_id)
    if not spreadsheet_id:
        logging.error("SPREADSHEET_ID invalide: %s", raw_spreadsheet_id)
        return 1
    # Récupère toutes les données de l'onglet AllVideos (en-têtes + lignes)
    range_all = "AllVideos!A1:O"
    values = fetch_sheet_values(spreadsheet_id, api_key, range_all)
    if not values:
        logging.warning("Aucune donnée récupérée depuis la feuille.\n")
    # Chemin du fichier de sortie
    data_dir = pathlib.Path("data")
    data_dir.mkdir(parents=True, exist_ok=True)
    json_path = data_dir / "videos.json"
    try:
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(values, f, ensure_ascii=False, indent=2)
        logging.info("Données écrites dans %s", json_path)
    except Exception as e:
        logging.error("Erreur lors de l'écriture du fichier %s: %s", json_path, e)
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())