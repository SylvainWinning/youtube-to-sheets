"""Read-only diagnostic. Never prints credentials or unavailable video identifiers."""
import os, json, time, collections
from pathlib import Path
from datetime import datetime, timezone
import requests

key = os.environ['YOUTUBE_API_KEY']
playlists = [value.strip() for value in os.environ['PLAYLIST_ID'].split(',')]
http_statuses = collections.Counter()
def api(resource, **params):
    for attempt in range(3):
        try:
            response = requests.get('https://www.googleapis.com/youtube/v3/' + resource,
                                    params={**params, 'key': key}, timeout=20)
        except requests.RequestException:
            if attempt == 2:
                raise RuntimeError('YouTube transport failed after three attempts') from None
            time.sleep(1)
            continue
        http_statuses[str(response.status_code)] += 1
        if response.status_code != 200:
            if response.status_code >= 500 and attempt < 2:
                time.sleep(1)
                continue
            raise RuntimeError('YouTube HTTP ' + str(response.status_code)) from None
        return response.json()

members = collections.defaultdict(list)
pagination = []
for index, playlist in enumerate(playlists):
    token = None
    seen_tokens = set()
    items = []
    expected = None
    while True:
        params = dict(part='snippet,contentDetails,status', playlistId=playlist, maxResults=50)
        if token:
            params['pageToken'] = token
        page = api('playlistItems', **params)
        expected = page.get('pageInfo', {}).get('totalResults', expected)
        items.extend(page.get('items', []))
        token = page.get('nextPageToken')
        if not token:
            break
        if token in seen_tokens:
            raise RuntimeError('Repeated pagination token; diagnostic incomplete')
        seen_tokens.add(token)
    pagination.append({'playlist': index + 1, 'items': len(items), 'expected': expected, 'complete': expected == len(items)})
    for item in items:
        identifier = item.get('contentDetails', {}).get('videoId')
        if identifier:
            members[identifier].append({'playlist': index + 1, 'title': item.get('snippet', {}).get('title', ''), 'privacy': item.get('status', {}).get('privacyStatus', 'unknown')})

ids = list(members)
returned = set()
for offset in range(0, len(ids), 50):
    page = api('videos', part='snippet,contentDetails,statistics', id=','.join(ids[offset:offset+50]))
    returned.update(item['id'] for item in page.get('items', []))
missing = set(ids) - returned
recovered = set()
for identifier in missing:
    page = api('videos', part='snippet,contentDetails,status', id=identifier)
    recovered.update(item['id'] for item in page.get('items', []))
labels, privacy, by_playlist = collections.Counter(), collections.Counter(), collections.Counter()
for identifier in missing - recovered:
    for member in members[identifier]:
        title = member['title'].strip().lower()
        label = 'deleted' if title == 'deleted video' else 'private' if title == 'private video' else 'other_unavailable'
        labels[label] += 1
        privacy[member['privacy']] += 1
        by_playlist[str(member['playlist'])] += 1
snapshot = json.loads(Path('data/videos.json').read_text())
rows = snapshot['videos'] if isinstance(snapshot, dict) else snapshot
old_ids = {row[2].split('v=')[-1].split('&')[0] for row in rows[1:] if len(row) > 2}
report = {'checkedAt': datetime.now(timezone.utc).isoformat(), 'readOnly': True,
          'pagination': pagination, 'uniqueListed': len(ids), 'detailsReturned': len(returned),
          'missingInBatch': len(missing), 'recoveredIndividually': len(recovered),
          'stillUnavailable': len(missing - recovered), 'playlistLabels': dict(labels),
          'privacyStatuses': dict(privacy), 'unavailableOccurrencesByPlaylist': dict(by_playlist),
          'unavailablePresentInPublishedCache': len((missing - recovered) & old_ids),
          'httpStatuses': dict(http_statuses)}
print('DIAGNOSTIC_JSON=' + json.dumps(report, ensure_ascii=False))
