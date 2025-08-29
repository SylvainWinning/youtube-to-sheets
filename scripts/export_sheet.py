import os
import json
import csv
import pathlib
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


SPREADSHEET_ID = os.environ["SPREADSHEET_ID"]
SHEET_RANGES = parse_ranges(os.environ.get("SHEET_RANGE", "AllVideos!A1:Z"))
for sheet_range in SHEET_RANGES:
    if "!" not in sheet_range:
        raise ValueError(
            f"SHEET_RANGE '{sheet_range}' must include a sheet name (e.g., 'Sheet1!A1:Z1000')"
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
