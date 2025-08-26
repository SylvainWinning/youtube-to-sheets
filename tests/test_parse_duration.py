import os
import sys

# Ajoute le répertoire parent au chemin pour pouvoir importer main
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

import main


def test_parse_duration_basic_cases():
    assert main.parse_duration("PT2H34M") == "02:34:00"
    assert main.parse_duration("PT2H34S") == "02:00:34"
    assert main.parse_duration("PT15M33S") == "00:15:33"
    assert main.parse_duration("PT0S") == "00:00:00"
    assert main.parse_duration("INVALID") == "Inconnue"


def test_parse_duration_additional_examples():
    assert main.parse_duration("PT2H34M") == "02:34:00"
    assert main.parse_duration("PT15M10S") == "00:15:10"
    assert main.parse_duration("PT45S") == "00:00:45"
