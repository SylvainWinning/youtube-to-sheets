import os
import json
import csv
import pathlib
from google.oauth2 import service_account
from googleapiclient.discovery import build

SPREADSHEET_ID = os.environ["SPREADSHEET_ID"]
SHEET_RANGE = os.environ.get("SHEET_RANGE", "AllVideos!A1:Z")  # adjust the sheet name if needed

# Read credentials from environment secret
creds_info = json.loads(os.environ["SERVICE_ACCOUNT_JSON"])
creds = service_account.Credentials.from_service_account_info(
    creds_info, scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"]
)

service = build("sheets", "v4", credentials=creds)
resp = service.spreadsheets().values().get(
    spreadsheetId=SPREADSHEET_ID, range=SHEET_RANGE
).execute()

values = resp.get("values", [])
out_dir = pathlib.Path("bolt-app/public/data")
out_dir.mkdir(parents=True, exist_ok=True)

# Save CSV
csv_path = out_dir / "videos.csv"
with csv_path.open("w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    for row in values:
        writer.writerow(row)

# Save JSON
json_path = out_dir / "videos.json"
if values:
    headers = values[0]
    rows = [
        {header: (row[i] if i < len(row) else "") for i, header in enumerate(headers)}
        for row in values[1:]
    ]
else:
    rows = []
json_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")

print(f"Exported {len(values)} rows to {csv_path} and {json_path}")
