import pytest
import main
from sync_metadata import read_snapshot, write_snapshot


@pytest.fixture
def synchronization(monkeypatch, tmp_path):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv('YOUTUBE_API_KEY', 'synthetic-key')
    monkeypatch.setenv('SPREADSHEET_ID', 'A' * 25)
    monkeypatch.setenv('SERVICE_ACCOUNT_JSON', '{}')
    monkeypatch.setattr(main.service_account.Credentials, 'from_service_account_info', lambda *a, **k: object())
    monkeypatch.setattr(main, 'build', lambda *a, **k: object())
    monkeypatch.setattr(main, 'get_channel_avatar', lambda *a: '')
    writes = []
    monkeypatch.setattr(main, 'write_library', lambda service, spreadsheet, categories, title, rows: writes.extend([*categories, title]))
    return writes


def entry(identifier):
    return ['', identifier, f'https://www.youtube.com/watch?v={identifier}', 'Channel', '2026-01-01', '00:01:00', '0', '0', '0', '', '', '1', '', '', '0', 'PL123']


def fetch_items(count, degraded=False):
    def fetch(*args, report, **kwargs):
        report.update(status='degraded' if degraded else 'complete', cacheCount=1 if degraded else 0)
        return [{'id': str(i), 'contentDetails': {'videoId': str(i)}, 'snippet': {'position': i}} for i in range(count)]
    return fetch


def details(ids, *args):
    return {identifier: {'snippet': {'title': identifier, 'publishedAt': '2026-01-01T00:00:00Z'}, 'contentDetails': {'duration': 'PT1M'}} for identifier in ids}


def test_complete_sync_advances_date_and_publishes_identical_provenance(synchronization, monkeypatch):
    monkeypatch.setattr(main, 'fetch_all_playlist_items', fetch_items(2))
    monkeypatch.setattr(main, 'fetch_videos_details', details)
    main.sync_videos('PL123')
    root = read_snapshot('data/videos.json')
    assert root == read_snapshot('bolt-app/public/data/videos.json')
    assert root[1]['status'] == 'complete'
    assert root[1]['lastSuccessfulSync']
    assert root[1]['videoCount'] == 2
    assert 'AllVideos' in synchronization


def test_missing_details_use_cache_and_do_not_advance_complete_date(synchronization, monkeypatch):
    write_snapshot('data/videos.json', [main.HEADERS, entry('0'), entry('1')], {'lastSuccessfulSync': '2026-10-10T12:00:00Z'})
    monkeypatch.setattr(main, 'fetch_all_playlist_items', fetch_items(2))
    monkeypatch.setattr(main, 'fetch_videos_details', lambda *args: details(['0']))
    main.sync_videos('PL123')
    values, metadata = read_snapshot('bolt-app/public/data/videos.json')
    assert len(values) == 3
    assert metadata['status'] == 'degraded'
    assert metadata['source'] == 'mixed'
    assert metadata['cachedDetailCount'] == 1
    assert metadata['lastSuccessfulSync'] == '2026-10-10T12:00:00Z'


def test_drop_is_rejected_before_any_sheet_is_cleared(synchronization, monkeypatch):
    write_snapshot('data/videos.json', [main.HEADERS] + [entry(str(i)) for i in range(10)], {})
    monkeypatch.setattr(main, 'fetch_all_playlist_items', fetch_items(2))
    monkeypatch.setattr(main, 'fetch_videos_details', details)
    with pytest.raises(ValueError, match='chute'):
        main.sync_videos('PL123')
    assert synchronization == []
    assert len(read_snapshot('data/videos.json')[0]) == 11


@pytest.mark.parametrize('privacy,title,expected_status,private_count', [
    ('private', 'Private video', 'complete', 1),
    ('public', 'Private video', 'degraded', 0),
    ('private', 'Deleted video', 'degraded', 0),
    ('private', 'Normal title', 'degraded', 0),
])
def test_private_placeholder_distinguished_from_missing_details(synchronization, monkeypatch, privacy, title, expected_status, private_count):
    def fetch(*args, report, **kwargs):
        report.update(status='complete', cacheCount=0)
        return [
            {'contentDetails': {'videoId': 'available'}, 'snippet': {'position': 0}},
            {'contentDetails': {'videoId': 'hidden'}, 'snippet': {'position': 1, 'title': title}, 'status': {'privacyStatus': privacy}},
        ]
    monkeypatch.setattr(main, 'fetch_all_playlist_items', fetch)
    monkeypatch.setattr(main, 'fetch_videos_details', lambda *args: details(['available']))
    main.sync_videos('PL123')
    rows, metadata = read_snapshot('data/videos.json')
    assert len(rows) == 2
    assert metadata['status'] == expected_status
    assert metadata['privateVideoCount'] == private_count
    assert metadata['missingDetailCount'] == 1 - private_count
    assert bool(metadata['lastSuccessfulSync']) == (expected_status == 'complete')


def test_private_videos_deduplicated_but_incomplete_pagination_stays_degraded(synchronization, monkeypatch):
    def fetch(*args, report, **kwargs):
        report.update(status='degraded', cacheCount=1)
        return [{'contentDetails': {'videoId': 'hidden'}, 'snippet': {'title': 'Private video'}, 'status': {'privacyStatus': 'private'}},
                {'contentDetails': {'videoId': 'available'}, 'snippet': {'position': 0}}]
    monkeypatch.setattr(main, 'fetch_all_playlist_items', fetch)
    monkeypatch.setattr(main, 'fetch_videos_details', lambda *args: details(['available']))
    main.sync_videos('PL123,PL456')
    metadata = read_snapshot('data/videos.json')[1]
    assert metadata['privateVideoCount'] == 1
    assert metadata['status'] == 'degraded'
    assert metadata['lastSuccessfulSync'] is None


def test_failed_sheet_publication_preserves_both_local_exports(synchronization, monkeypatch):
    previous = [main.HEADERS, entry('0'), entry('1')]
    for path in ['data/videos.json', 'bolt-app/public/data/videos.json']:
        write_snapshot(path, previous, {'lastSuccessfulSync': '2026-10-10T12:00:00Z'})
    monkeypatch.setattr(main, 'fetch_all_playlist_items', fetch_items(2))
    monkeypatch.setattr(main, 'fetch_videos_details', details)
    def reject(*args):
        raise RuntimeError('publication rejected')
    monkeypatch.setattr(main, 'write_library', reject)
    with pytest.raises(RuntimeError, match='publication rejected'):
        main.sync_videos('PL123')
    for path in ['data/videos.json', 'bolt-app/public/data/videos.json']:
        rows, metadata = read_snapshot(path)
        assert rows == previous
        assert metadata['lastSuccessfulSync'] == '2026-10-10T12:00:00Z'
