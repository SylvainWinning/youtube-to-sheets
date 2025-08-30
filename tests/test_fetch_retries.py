import requests
from main import fetch_all_playlist_items, fetch_videos_details


def test_fetch_all_playlist_items_max_retries():
    calls = {"count": 0}

    class FailingRequest:
        def __init__(self, calls):
            self.calls = calls

        def execute(self):
            self.calls["count"] += 1
            raise Exception("boom")

    class FailingPlaylistItems:
        def __init__(self, calls):
            self.calls = calls

        def list(self, **kwargs):
            return FailingRequest(self.calls)

    class FailingService:
        def __init__(self, calls):
            self.calls = calls

        def playlistItems(self):
            return FailingPlaylistItems(self.calls)

    service = FailingService(calls)
    items = fetch_all_playlist_items("playlist", service, max_retries=3)
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
