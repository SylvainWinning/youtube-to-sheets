import logging
from main import sync_videos


def test_sync_videos_handles_fetch_error(monkeypatch, caplog, tmp_path):
    monkeypatch.setenv("YOUTUBE_API_KEY", "key")
    monkeypatch.setenv("SPREADSHEET_ID", "A" * 25)
    monkeypatch.setenv("PLAYLIST_ID", "PL1234567890ABCDE")
    monkeypatch.setenv("SERVICE_ACCOUNT_JSON", "{}")

    monkeypatch.setattr(
        "main.service_account.Credentials.from_service_account_info",
        lambda *a, **k: object(),
    )
    monkeypatch.setattr("main.build", lambda *a, **k: None)

    def fake_fetch(*args, **kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr("main.fetch_all_playlist_items", fake_fetch)

    with caplog.at_level(logging.ERROR):
        sync_videos()
    assert "Impossible de récupérer les vidéos de la playlist" in caplog.text
