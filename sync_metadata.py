"""Publication atomique et provenance des copies de la bibliothèque."""
from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path


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


def fingerprint(rows):
    normalized = sorted([str(cell) for cell in row] + [""] * max(0, len(rows[0]) - len(row)) for row in rows[1:])
    return hashlib.sha256(json.dumps(normalized, ensure_ascii=False).encode()).hexdigest()


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
    previous, old = read_snapshot(path)
    reference_rows, provenance = read_snapshot(reference)
    check_volume(rows, previous)
    check_volume(rows, reference_rows)
    matched = provenance.get("dataHash") == fingerprint(rows)
    metadata = dict(provenance if matched else old)
    if not matched:
        metadata.pop("privateVideoCount", None)
        metadata.update(status="unknown", source="sheets", warnings=["sync_not_verified"])
    metadata["publishedAt"] = now()
    write_snapshot(path, rows, metadata)


def preserve_failed_sync(reason="sync_failed", root="data/videos.json", public="bolt-app/public/data/videos.json"):
    """Publie l'échec sans remplacer les vidéos ni inventer un succès."""
    rows, metadata = read_snapshot(root)
    if not counts(rows).get("all"):
        rows, metadata = read_snapshot(public)
    if not counts(rows).get("all"):
        return False
    metadata.update(status="degraded", source="cache", lastAttempt=now(), publishedAt=now(), warnings=[reason])
    write_snapshot(root, rows, metadata)
    write_snapshot(public, rows, metadata)
    return True
