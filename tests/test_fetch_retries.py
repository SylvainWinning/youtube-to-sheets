import requests
from main import fetch_all_playlist_items, fetch_videos_details


def test_fetch_all_playlist_items_max_retries(monkeypatch):
    calls = {"count": 0}

    def fake_get(url, params=None, timeout=None):
        calls["count"] += 1
        raise requests.RequestException("boom")

    monkeypatch.setattr(requests, "get", fake_get)
    items = fetch_all_playlist_items("playlist", "key", max_retries=3)
    assert items == []
    assert calls["count"] == 3


def test_fetch_videos_details_max_retries(monkeypatch):
    calls = {"count": 0}

    def fake_get(url, params=None, timeout=None):
        calls["count"] += 1
        raise requests.RequestException("boom")

    monkeypatch.setattr(requests, "get", fake_get)
    details = fetch_videos_details(["id1"], "key", max_retries=3)
    assert details == {}
    assert calls["count"] == 3
