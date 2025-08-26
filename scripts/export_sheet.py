import os, json, csv, pathlib
from typing import List
from google.oauth2 import service_account
from googleapiclient.discovery import build


def parse_tabs(val: str) -> List[str]:
    if not val:
        return []
    # Accepte liste séparée par virgules OU sur plusieurs lignes
    parts = val.split(",") if "," in val else val.splitlines()
    return [p.strip() for p in parts if p.strip()]


def ensure_parent(path: pathlib.Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def write_csv(path: pathlib.Path, headers: list, rows: list) -> None:
    ensure_parent(path)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        if headers:
            w.writerow(headers)
        for r in rows:
            w.writerow([r.get(h, "") for h in headers])


def write_json(path: pathlib.Path, rows: list) -> None:
    ensure_parent(path)
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")


def main():
    spreadsheet_id = os.environ["SPREADSHEET_ID"]
    creds_info = json.loads(os.environ["SERVICE_ACCOUNT_JSON"])
    creds = service_account.Credentials.from_service_account_info(
        creds_info,
        scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"],
    )
    service = build("sheets", "v4", credentials=creds)

    sheet_tabs = os.environ.get("SHEET_TABS", "").strip()
    sheet_range = os.environ.get("SHEET_RANGE", "").strip()  # mode mono-onglet si besoin

    rows = []
    headers_union = []

    if sheet_tabs:
        tabs = parse_tabs(sheet_tabs)
        ranges = [f"{t}!A1:Z" for t in tabs]
        res = service.spreadsheets().values().batchGet(
            spreadsheetId=spreadsheet_id, ranges=ranges
        ).execute()
        vrs = res.get("valueRanges", [])

        # union des en-têtes dans l'ordre d'apparition
        for vr in vrs:
            values = vr.get("values", [])
            if not values:
                continue
            hdrs = values[0]
            for h in hdrs:
                if h not in headers_union:
                    headers_union.append(h)
        if "_sheet" not in headers_union:
            headers_union.append("_sheet")

        # lignes fusionnées
        for tab, vr in zip(tabs, vrs):
            values = vr.get("values", [])
            if not values:
                continue
            hdrs = values[0]
            for r in values[1:]:
                d = {hdrs[i]: (r[i] if i < len(r) else "") for i in range(len(hdrs))}
                d["_sheet"] = tab
                rows.append(d)

    else:
        # mode simple pour compatibilité: une seule plage (ex: "0-5 min!A1:Z")
        rng = sheet_range or "A1:Z"
        values = (
            service.spreadsheets()
            .values()
            .get(spreadsheetId=spreadsheet_id, range=rng)
            .execute()
            .get("values", [])
        )
        if values:
            headers_union = values[0]
            rows = [
                {headers_union[i]: (r[i] if i < len(headers_union) else "") for i in range(len(headers_union))}
                for r in values[1:]
            ]

    out_dir = pathlib.Path("bolt-app/public/data")
    csv_path = out_dir / "videos.csv"
    json_path = out_dir / "videos.json"

    write_csv(csv_path, headers_union, rows)
    write_json(json_path, rows)
    print(f"Wrote {csv_path} and {json_path} with {len(rows)} rows and {len(headers_union)} cols")


if __name__ == "__main__":
    main()
