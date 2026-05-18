import logging
import pytest
from main import sync_videos


def test_sync_videos_handles_fetch_error(monkeypatch, caplog, tmp_path):
    monkeypatch.setenv("YOUTUBE_API_KEY", "key")
    monkeypatch.setenv("SPREADSHEET_ID", "A" * 25)
    monkeypatch.setenv("SERVICE_ACCOUNT_JSON", "{}")

    monkeypatch.setattr(
        "main.service_account.Credentials.from_service_account_info",
        lambda *a, **k: object(),
    )
    monkeypatch.setattr("main.build", lambda *a, **k: None)

    def fake_fetch(*args, **kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr("main.fetch_all_playlist_items", fake_fetch)

    with caplog.at_level(logging.ERROR), pytest.raises(RuntimeError, match="boom"):
        sync_videos("PL123")
    assert "Impossible de récupérer les vidéos de la playlist" in caplog.text


def test_sync_videos_stops_when_playlist_is_empty(monkeypatch, caplog):
    monkeypatch.setenv("YOUTUBE_API_KEY", "key")
    monkeypatch.setenv("SPREADSHEET_ID", "A" * 25)
    monkeypatch.setenv("SERVICE_ACCOUNT_JSON", "{}")

    monkeypatch.setattr(
        "main.service_account.Credentials.from_service_account_info",
        lambda *a, **k: object(),
    )
    monkeypatch.setattr("main.build", lambda *a, **k: None)
    monkeypatch.setattr("main.fetch_all_playlist_items", lambda *a, **k: [])
    monkeypatch.setattr(
        "main.fetch_videos_details",
        lambda *a, **k: (_ for _ in ()).throw(AssertionError("should not continue")),
    )

    with caplog.at_level(logging.ERROR), pytest.raises(RuntimeError, match="Aucun élément récupéré"):
        sync_videos("PL123")

    assert "Aucun élément récupéré pour la playlist PL123" in caplog.text


def test_sync_videos_missing_spreadsheet_id(monkeypatch, caplog):
    """Vérifie qu'un message clair est journalisé si SPREADSHEET_ID est absent."""
    monkeypatch.setenv("YOUTUBE_API_KEY", "key")
    monkeypatch.setenv("SERVICE_ACCOUNT_JSON", "{}")

    with caplog.at_level(logging.ERROR):
        sync_videos("PL123")

    assert "Variable d'environnement SPREADSHEET_ID manquante" in caplog.text
