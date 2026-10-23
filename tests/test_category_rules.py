from category_rules import migrate_channel_rules


def test_one_time_migration_uses_api_ids_preserves_overrides_and_does_not_mutate():
    identifier = 'UC' + 'a' * 22
    rules = {'migrationComplete': False, 'channels': {}, 'videos': {'video': 'Culture'}, 'legacyNames': {'Known': 'Tech'}}
    migrated = migrate_channel_rules(rules, {'video': {'snippet': {'channelId': identifier, 'channelTitle': 'Known'}}})
    assert rules['channels'] == {}
    assert migrated['channels'] == {identifier: 'Tech'}
    assert migrated['videos'] == {'video': 'Culture'}
    assert migrated['migrationComplete'] is True
    renamed = migrate_channel_rules(migrated, {'new': {'snippet': {'channelId': 'UC' + 'b' * 22, 'channelTitle': 'Known'}}})
    assert renamed == migrated


def test_existing_id_rule_wins_and_invalid_ids_are_not_invented():
    identifier = 'UC' + 'a' * 22
    rules = {'migrationComplete': False, 'channels': {identifier: 'Culture'}, 'videos': {}, 'legacyNames': {'Known': 'Tech'}}
    assert migrate_channel_rules(rules, {'video': {'snippet': {'channelId': identifier, 'channelTitle': 'Known'}}})['channels'][identifier] == 'Culture'
    rules['channels'] = {}
    assert not migrate_channel_rules(rules, {'bad': {'snippet': {'channelId': 'invalid', 'channelTitle': 'Known'}}})['migrationComplete']
