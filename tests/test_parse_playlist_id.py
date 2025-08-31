from main import parse_playlist_id

def test_parse_playlist_id_accepts_url():
    url = "https://www.youtube.com/playlist?list=PLabc1234567890"
    assert parse_playlist_id(url) == "PLabc1234567890"

def test_parse_playlist_id_rejects_invalid():
    assert parse_playlist_id("invalid") is None
