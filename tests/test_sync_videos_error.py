import logging
from main import sync_videos


def test_sync_videos_handles_fetch_error(monkeypatch, caplog, tmp_path):
    monkeypatch.setenv("YOUTUBE_API_KEY", "key")
    monkeypatch.setenv("SPREADSHEET_ID", "A" * 25)
    service_file = tmp_path / "dummy.json"
    service_file.write_text("{}")
    monkeypatch.setenv("SERVICE_ACCOUNT_FILE", str(service_file))

    monkeypatch.setattr(
        "main.service_account.Credentials.from_service_account_file",
        lambda *a, **k: object(),
    )
    monkeypatch.setattr("main.build", lambda *a, **k: None)

    def fake_fetch(*args, **kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr("main.fetch_all_playlist_items", fake_fetch)

    with caplog.at_level(logging.ERROR):
        sync_videos()
    assert "Impossible de récupérer les vidéos de la playlist" in caplog.text
