import logging
import requests
import pytest
from main import fetch_all_playlist_items, fetch_videos_details


def test_fetch_all_playlist_items_max_retries(monkeypatch, caplog):
    calls = {"count": 0}

    def fake_get(url, params=None, timeout=None):
        calls["count"] += 1
        raise requests.RequestException("boom")

    monkeypatch.setattr(requests, "get", fake_get)
    with caplog.at_level(logging.ERROR):
        with pytest.raises(RuntimeError):
            fetch_all_playlist_items("playlist", "key", max_retries=3)
    assert calls["count"] == 3
    assert "Toutes les tentatives" in caplog.text


def test_fetch_videos_details_max_retries(monkeypatch):
    calls = {"count": 0}

    def fake_get(url, params=None, timeout=None):
        calls["count"] += 1
        raise requests.RequestException("boom")

    monkeypatch.setattr(requests, "get", fake_get)
    details = fetch_videos_details(["id1"], "key", max_retries=3)
    assert details == {}
    assert calls["count"] == 3
