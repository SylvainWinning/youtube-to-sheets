import logging
import json
import requests
import pytest
from main import fetch_all_playlist_items, fetch_videos_details, load_cached_playlist_items


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


def test_load_cached_playlist_items(tmp_path):
    cache_path = tmp_path / "videos.json"
    cache_path.write_text(
        json.dumps(
            [
                ["link", "playlistPosition", "playlistId"],
                ["https://www.youtube.com/watch?v=abcdefghijk", "2", "wanted"],
                ["https://youtu.be/lmnopqrstuv", "1", "wanted"],
                ["https://www.youtube.com/watch?v=zzzzzzzzzzz", "0", "other"],
            ]
        )
    )

    items = load_cached_playlist_items("wanted", str(cache_path))

    assert [item["contentDetails"]["videoId"] for item in items] == [
        "lmnopqrstuv",
        "abcdefghijk",
    ]


def test_fetch_videos_details_max_retries(monkeypatch):
    calls = {"count": 0}

    def fake_get(url, params=None, timeout=None):
        calls["count"] += 1
        raise requests.RequestException("boom")

    monkeypatch.setattr(requests, "get", fake_get)
    details = fetch_videos_details(["id1"], "key", max_retries=3)
    assert details == {}
    assert calls["count"] == 3


def test_pagination_cache_is_explicitly_degraded(monkeypatch, tmp_path):
    cache = tmp_path / 'videos.json'
    cache.write_text(json.dumps({'schemaVersion': 1, 'metadata': {}, 'videos': [
        ['link', 'playlistPosition', 'playlistId'],
        ['https://youtu.be/abcdefghijk', '0', 'playlist'],
        ['https://youtu.be/lmnopqrstuv', '1', 'playlist'],
    ]}))
    def get(url, params, **kwargs):
        response = requests.Response()
        response.url = url
        response.status_code = 404 if params.get('pageToken') else 200
        response._content = json.dumps({'items': [{'id': 'fresh', 'contentDetails': {'videoId': 'abcdefghijk'}}], 'nextPageToken': 'stale'}).encode()
        return response
    monkeypatch.setattr(requests, 'get', get)
    report = {}
    items = fetch_all_playlist_items('playlist', 'key', max_retries=1, cache_path=str(cache), report=report)
    assert len(items) == 2
    assert report == {'status': 'degraded', 'source': 'mixed', 'freshCount': 1, 'cacheCount': 1}


def test_inconsistent_total_never_proves_complete_pagination(monkeypatch):
    def get(url, **kwargs):
        response = requests.Response()
        response.status_code = 200
        response._content = json.dumps({'items': [{'id': 'one'}], 'pageInfo': {'totalResults': 2}}).encode()
        return response
    monkeypatch.setattr(requests, 'get', get)
    report = {}
    fetch_all_playlist_items('playlist', 'key', report=report)
    assert report['status'] == 'degraded'
    assert report['expectedCount'] == 2
