from types import SimpleNamespace
from unittest.mock import MagicMock
import pytest
import main


def row(title='=not a formula'):
    return ['', title, 'https://www.youtube.com/watch?v=abcdefghijk'] + [''] * 13


def service(fail=False, corrupt=False):
    api = MagicMock()
    api.get.return_value.execute.return_value = {'sheets': [{'properties': {
        'title': 'AllVideos', 'sheetId': 7, 'gridProperties': {'rowCount': 100, 'columnCount': 20}}}]}
    api.values.return_value.batchGet.return_value.execute.return_value = {'valueRanges': [
        {'values': [main.HEADERS]}, {'values': [main.HEADERS, row()] if not corrupt else [main.HEADERS]}]}
    if fail:
        api.batchUpdate.return_value.execute.side_effect = RuntimeError('rejected batch')
    return SimpleNamespace(spreadsheets=lambda: api), api


def test_one_atomic_batch_creates_missing_tabs_clears_stale_values_and_preserves_formatting():
    client, api = service()
    api.values.return_value.batchGet.return_value.execute.return_value = {'valueRanges': [
        {'values': [main.HEADERS, row()]}, {'values': [main.HEADERS, row()]}]}
    main.write_library(client, 'sheet', {'Short': [row()]}, 'AllVideos', [row()])
    api.batchUpdate.assert_called_once()
    requests = api.batchUpdate.call_args.kwargs['body']['requests']
    assert requests[0]['addSheet']['properties']['sheetId'] == 8
    updates = [request['updateCells'] for request in requests if 'updateCells' in request]
    assert len(updates) == 2
    assert all(update['fields'] == 'userEnteredValue' for update in updates)
    assert all('endRowIndex' not in update['range'] for update in updates)
    assert updates[-1]['range']['endColumnIndex'] == 16
    assert updates[-1]['rows'][1]['values'][1]['userEnteredValue'] == {'stringValue': '=not a formula'}
    api.values.return_value.update.assert_not_called()


@pytest.mark.parametrize('categories,title', [({'Short': []}, 'AllVideos'), ({'AllVideos': [row()]}, 'AllVideos')])
def test_invalid_partition_or_title_never_contacts_sheets(categories, title):
    client, api = service()
    with pytest.raises(ValueError):
        main.write_library(client, 'sheet', categories, title, [row()])
    api.get.assert_not_called()
    api.batchUpdate.assert_not_called()


def test_rejected_batch_has_no_second_write_or_readback():
    client, api = service(fail=True)
    with pytest.raises(RuntimeError, match='rejected batch'):
        main.write_library(client, 'sheet', {'Empty': []}, 'AllVideos', [])
    api.batchUpdate.assert_called_once()
    api.values.assert_not_called()


def test_readback_mismatch_blocks_success():
    client, api = service(corrupt=True)
    with pytest.raises(RuntimeError, match='incohérent'):
        main.write_library(client, 'sheet', {'Short': [row()]}, 'AllVideos', [row()])
