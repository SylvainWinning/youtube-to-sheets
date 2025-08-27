import os
import sys

# Ajoute le répertoire parent au chemin pour pouvoir importer main
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

import main


def test_all_videos_length_matches_sum():
    videos_by_category = {"0-5min": [], "5-10min": []}
    all_videos = []

    main.add_video_to_categories(["video1"], "0-5min", videos_by_category, all_videos)
    main.add_video_to_categories(["video2"], "5-10min", videos_by_category, all_videos)
    main.add_video_to_categories(["video3"], "5-10min", videos_by_category, all_videos)

    total = sum(len(v) for v in videos_by_category.values())
    assert len(all_videos) == total
