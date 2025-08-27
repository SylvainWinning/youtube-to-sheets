import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

import main


def test_headers_contains_avatar_and_category():
    assert "Avatar" in main.HEADERS
    assert "Catégorie" in main.HEADERS
