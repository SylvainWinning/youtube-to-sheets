import os
import re
import json
import csv
import pathlib
import argparse
from typing import List

from google.oauth2 import service_account
from googleapiclient.discovery import build


def parse_ranges(raw: str) -> List[str]:
    """Return a list of sheet ranges from env string.

    Accepts either a comma-separated string ("Tab1!A1:Z,Tab2!A1:Z") or a JSON
    array ("['Tab1!A1:Z', 'Tab2!A1:Z']").
    """

    raw = raw.strip()
    if raw.startswith("["):
        return [s.strip() for s in json.loads(raw)]
    return [s.strip() for s in raw.split(",") if s.strip()]


def parse_spreadsheet_id(value: str) -> str:
    match = re.search(r"/spreadsheets/d/([A-Za-z0-9-_]{25,60})", value or "")
    if match:
        return match.group(1)
    if re.fullmatch(r"[A-Za-z0-9-_]{25,60}", value or ""):
        return value.strip()
    raise ValueError("SPREADSHEET_ID invalide")


parser = argparse.ArgumentParser(description="Export specified sheet ranges to CSV and JSON")
parser.add_argument(
    "--sheet-ranges",
    help="Comma-separated or JSON array of sheet ranges to export",
)
args = parser.parse_args()

SPREADSHEET_ID = parse_spreadsheet_id(os.environ["SPREADSHEET_ID"])
sheet_ranges_raw = args.sheet_ranges or os.environ.get("SHEET_RANGE", "AllVideos!A1:Z")
SHEET_RANGES = parse_ranges(sheet_ranges_raw)
for sheet_range in SHEET_RANGES:
    if "!" not in sheet_range:
        raise ValueError(
            f"--sheet-ranges '{sheet_range}' must include a sheet name (e.g., 'Sheet1!A1:Z1000')"
        )

# Read credentials from environment secret
creds_info = json.loads(os.environ["SERVICE_ACCOUNT_JSON"])
creds = service_account.Credentials.from_service_account_info(
    creds_info,
    scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"],
)

service = build("sheets", "v4", credentials=creds)

all_values: List[List[str]] = []
for idx, sheet_range in enumerate(SHEET_RANGES):
    resp = service.spreadsheets().values().get(
        spreadsheetId=SPREADSHEET_ID, range=sheet_range
    ).execute()
    values = resp.get("values", [])
    if not values:
        continue
    if idx == 0:
        all_values.extend(values)
    else:
        all_values.extend(values[1:])

out_dir = pathlib.Path("bolt-app/public/data")
out_dir.mkdir(parents=True, exist_ok=True)

if all_values:
    header, *rows = all_values
    rows = [row for row in rows if len(row) > 1 and row[1] != "Inconnu"]
    all_values = [header] + rows

# Save CSV


csv_path = out_dir / "videos.csv"
with open(csv_path, "w", newline="", encoding="utf-8") as csvfile:
    writer = csv.writer(csvfile)
    writer.writerows(all_values)

# Save JSON
json_path = out_dir / "videos.json"
with open(json_path, "w", encoding="utf-8") as jsonfile:
    json.dump(all_values, jsonfile, ensure_ascii=False, indent=2)

# Print lines for debugging
for row in all_values:
    print(row)
