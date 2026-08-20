import logging
import json
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


def test_fetch_all_playlist_items_restarts_after_stale_page_token(monkeypatch, caplog):
    responses = [
        ({"items": [{"id": "old-1"}], "nextPageToken": "stale"}, 200),
        ({}, 404),
        ({"items": [{"id": "fresh-1"}], "nextPageToken": "fresh"}, 200),
        ({"items": [{"id": "fresh-1"}, {"id": "fresh-2"}]}, 200),
    ]
    requested_pages = []

    def fake_get(url, params=None, timeout=None):
        requested_pages.append((params["maxResults"], params.get("pageToken")))
        payload, status = responses.pop(0)
        response = requests.Response()
        response.status_code = status
        response.url = url
        response._content = json.dumps(payload).encode()
        return response

    monkeypatch.setattr(requests, "get", fake_get)
    with caplog.at_level(logging.WARNING):
        items = fetch_all_playlist_items("playlist", "key")

    assert [item["id"] for item in items] == ["fresh-1", "fresh-2"]
    assert requested_pages == [(50, None), (50, "stale"), (25, None), (25, "fresh")]
    assert "pages de 25 éléments" in caplog.text


def test_fetch_videos_details_max_retries(monkeypatch):
    calls = {"count": 0}

    def fake_get(url, params=None, timeout=None):
        calls["count"] += 1
        raise requests.RequestException("boom")

    monkeypatch.setattr(requests, "get", fake_get)
    details = fetch_videos_details(["id1"], "key", max_retries=3)
    assert details == {}
    assert calls["count"] == 3
