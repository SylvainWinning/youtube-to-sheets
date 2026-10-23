from copy import deepcopy
import re


def migrate_channel_rules(rules, videos):
    """One-time migration from existing names to authenticated API channel IDs."""
    result = deepcopy(rules)
    if result.get('migrationComplete'):
        return result
    for info in videos.values():
        snippet = info.get('snippet', {})
        identifier = snippet.get('channelId', '')
        category = result.get('legacyNames', {}).get(snippet.get('channelTitle', '').strip())
        if category and re.fullmatch(r'UC[A-Za-z0-9_-]{22}', identifier):
            result['channels'].setdefault(identifier, category)
    # Synthetic / old data without IDs cannot complete the migration.
    if result['channels']:
        result['migrationComplete'] = True
    return result
