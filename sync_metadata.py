"""Publication atomique et provenance des copies de la bibliothèque."""
from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path


# Colonnes attendues pour l’export CSV/Google Sheets
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
    "playlistId",
    "channelId",
]


def validate_table(rows):
    """Require the current header or its supported pre-channelId version."""
    if not rows or rows[0] not in (HEADERS, HEADERS[:-1]):
        raise ValueError("Colonnes de l’export incompatibles")
    for index, row in enumerate(rows[1:], start=2):
        if (not isinstance(row, list) or not 3 <= len(row) <= len(rows[0])
                or not isinstance(row[1], str) or not row[1].strip()
                or not isinstance(row[2], str) or not row[2].strip()):
            raise ValueError(f"Ligne d’export invalide : {index}")


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def read_snapshot(path):
    try:
        value = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return [], {}
    if isinstance(value, list):
        return value, {}
    if isinstance(value, dict) and isinstance(value.get("videos"), list):
        return value["videos"], value.get("metadata", {}) if isinstance(value.get("metadata"), dict) else {}
    return [], {}


def counts(rows):
    if not rows or "link" not in rows[0]:
        return {}
    link = rows[0].index("link")
    playlist = rows[0].index("playlistId") if "playlistId" in rows[0] else None
    groups = {"all": set()}
    for row in rows[1:]:
        if len(row) <= link or not row[link]:
            continue
        groups["all"].add(row[link])
        if playlist is not None and len(row) > playlist:
            groups.setdefault(str(row[playlist]), set()).add(row[link])
    return {key: len(value) for key, value in groups.items()}


def _normalized_rows(rows):
    return sorted([str(cell) for cell in row] + [""] * max(0, len(rows[0]) - len(row)) for row in rows[1:])


def _hash(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False).encode()).hexdigest()


def fingerprint(rows):
    return _hash([rows[0], _normalized_rows(rows)])


def check_volume(candidate, previous, max_drop=None):
    limit = float(os.environ.get("MAX_VIDEO_DROP_RATIO", "0.20")) if max_drop is None else max_drop
    if not 0 <= limit < 1:
        raise ValueError("MAX_VIDEO_DROP_RATIO doit être compris entre 0 et 1 exclu")
    current, baseline = counts(candidate), counts(previous)
    if not current.get("all"):
        raise ValueError("Publication refusée : aucune vidéo")
    for group, count in baseline.items():
        if count and current.get(group, 0) < count * (1 - limit):
            raise ValueError("Publication refusée : chute du volume de vidéos")


def write_snapshot(path, rows, metadata):
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    value = {"schemaVersion": 1, "metadata": {**metadata, "videoCount": counts(rows).get("all", 0),
             "rowCount": max(0, len(rows) - 1), "dataHash": fingerprint(rows)}, "videos": rows}
    temporary = destination.with_suffix(destination.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(destination)


def export_snapshot(path, rows, reference="data/videos.json"):
    validate_table(rows)
    previous, old = read_snapshot(path)
    reference_rows, provenance = read_snapshot(reference)
    check_volume(rows, previous)
    check_volume(rows, reference_rows)
    matched = False
    if reference_rows:
        # Accept historical hashes only after comparing both headers and rows.
        reference_hash = fingerprint(reference_rows)
        matched = (reference_hash == fingerprint(rows)
                   and provenance.get("dataHash") in (reference_hash, _hash(_normalized_rows(reference_rows))))
    metadata = dict(provenance if matched else old)
    if not matched:
        metadata.pop("privateVideoCount", None)
        metadata.update(status="unknown", source="sheets", warnings=["sync_not_verified"])
    metadata["publishedAt"] = now()
    write_snapshot(path, rows, metadata)


def preserve_failed_sync(reason="sync_failed", root="data/videos.json", public="bolt-app/public/data/videos.json"):
    """Publie l'échec sans remplacer les vidéos ni inventer un succès."""
    root_snapshot, public_snapshot = read_snapshot(root), read_snapshot(public)
    written = False
    for path, snapshot, fallback in (
        (root, root_snapshot, public_snapshot), (public, public_snapshot, root_snapshot)
    ):
        rows, metadata = snapshot if counts(snapshot[0]).get("all") else fallback
        if counts(rows).get("all"):
            write_snapshot(path, rows, {**metadata, "status": "degraded", "source": "cache",
                                        "lastAttempt": now(), "publishedAt": now(), "warnings": [reason]})
            written = True
    return written
