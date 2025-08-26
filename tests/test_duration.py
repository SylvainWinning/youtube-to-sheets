import os
import sys

# Ajoute le répertoire parent au chemin pour pouvoir importer main
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

import pytest
import main


def test_parse_duration_full():
    assert main.parse_duration("PT2H15M30S") == "02:15:30"


def test_parse_duration_without_minutes_or_seconds():
    assert main.parse_duration("PT3H") == "03:00:00"
    assert main.parse_duration("PT45S") == "00:00:45"


def test_parse_duration_invalid():
    assert main.parse_duration("BAD") == "Inconnue"


@pytest.mark.parametrize(
    "duration,expected",
    [
        ("00:05:00", "0-5min"),
        ("00:10:00", "5-10min"),
        ("00:20:00", "10-20min"),
        ("00:30:00", "20-30min"),
        ("00:40:00", "30-40min"),
        ("00:50:00", "40-50min"),
        ("01:00:00", "50-60min"),
        ("01:00:01", "60Plusmin"),
    ],
)
def test_get_duration_category(duration, expected):
    assert main.get_duration_category(duration) == expected
