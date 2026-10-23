import pytest

from sync_metadata import check_volume, export_snapshot, read_snapshot, write_snapshot


def rows(count, playlist="primary"):
    return [["link", "playlistId"]] + [[f"video-{i}", playlist] for i in range(count)]


def test_volume_guard_rejects_empty_and_large_drop():
    with pytest.raises(ValueError):
        check_volume(rows(0), rows(100))
    with pytest.raises(ValueError):
        check_volume(rows(79), rows(100))
    check_volume(rows(80), rows(100))


def test_volume_guard_checks_each_playlist_even_when_total_grows():
    previous = rows(100) + rows(10, "secondary")[1:]
    candidate = rows(79) + rows(100, "secondary")[1:]
    with pytest.raises(ValueError):
        check_volume(candidate, previous)


def test_export_keeps_verified_provenance_only_for_matching_data(tmp_path):
    reference, destination = tmp_path / "reference.json", tmp_path / "public.json"
    write_snapshot(reference, rows(10), {"status": "complete", "source": "youtube", "lastSuccessfulSync": "2026-10-11T12:00:00Z"})
    export_snapshot(destination, rows(10), reference)
    assert read_snapshot(destination)[1]["status"] == "complete"
    export_snapshot(destination, rows(11), reference)
    metadata = read_snapshot(destination)[1]
    assert metadata["status"] == "unknown"
    assert metadata["source"] == "sheets"
    assert metadata["lastSuccessfulSync"] == "2026-10-11T12:00:00Z"


def test_rejected_export_preserves_published_snapshot(tmp_path):
    destination = tmp_path / "videos.json"
    write_snapshot(destination, rows(100), {"status": "complete"})
    before = destination.read_bytes()
    with pytest.raises(ValueError):
        export_snapshot(destination, rows(1), destination)
    assert destination.read_bytes() == before


def test_failure_publishes_cache_without_advancing_success_date(tmp_path):
    from sync_metadata import preserve_failed_sync
    root, public = tmp_path / "root.json", tmp_path / "public.json"
    write_snapshot(root, rows(10), {"status": "complete", "lastSuccessfulSync": "2026-10-10T12:00:00Z"})
    assert preserve_failed_sync(root=root, public=public)
    values, metadata = read_snapshot(public)
    assert values == rows(10)
    assert metadata["lastSuccessfulSync"] == "2026-10-10T12:00:00Z"
    assert metadata["status"] == "degraded"
    assert metadata["source"] == "cache"
    assert metadata["lastAttempt"]


def test_fingerprint_includes_new_channel_id_and_normalizes_missing_trailing_cell():
    from sync_metadata import fingerprint
    headers = [''] * 17
    assert fingerprint([headers, ['a'] * 16]) == fingerprint([headers, ['a'] * 16 + ['']])
    assert fingerprint([headers, ['a'] * 16 + ['UCfirst']]) != fingerprint([headers, ['a'] * 16 + ['UCsecond']])
