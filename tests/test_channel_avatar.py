import requests
from main import get_channel_avatar, DEFAULT_AVATAR_URL, channel_avatar_cache


def test_get_channel_avatar_success(monkeypatch):
    channel_avatar_cache.clear()

    def fake_get(url, timeout):
        class Response:
            def raise_for_status(self):
                pass

            def json(self):
                return {
                    "items": [
                        {
                            "snippet": {
                                "thumbnails": {
                                    "default": {"url": "http://example.com/avatar.jpg"}
                                }
                            }
                        }
                    ]
                }

        return Response()

    monkeypatch.setattr(requests, "get", fake_get)
    url = get_channel_avatar("abc", api_key="key")
    assert url == "http://example.com/avatar.jpg"


def test_get_channel_avatar_error_returns_default(monkeypatch):
    channel_avatar_cache.clear()

    def fake_get(url, timeout):
        raise requests.RequestException("boom")

    monkeypatch.setattr(requests, "get", fake_get)
    url = get_channel_avatar("abc", api_key="key")
    assert url == DEFAULT_AVATAR_URL
