import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from main import format_published_at


def test_format_published_at_includes_time_and_prefix():
    iso = "2025-01-07T13:45:00Z"
    assert format_published_at(iso) == "'07/01/2025 13:45"


def test_format_published_at_invalid_returns_empty_string():
    invalid_iso = "not-a-date"
    assert format_published_at(invalid_iso) == ""
