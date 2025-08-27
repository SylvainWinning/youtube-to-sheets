import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

import main

EXPECTED_HEADERS = [
    "thumbnail",
    "title",
    "link",
    "channel",
    "publishedAt",
    "duration",
    "views",
    "likes",
    "comments",
    "shortDescription",
    "tags",
    "category",
    "channelAvatar",
]


def test_headers_match_expected_list():
    assert main.HEADERS == EXPECTED_HEADERS
