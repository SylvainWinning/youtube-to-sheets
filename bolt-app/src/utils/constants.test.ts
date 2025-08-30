import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSpreadsheetId, isValidSpreadsheetId } from './constants.ts';

test('parseSpreadsheetId extracts id from full URL', () => {
  const id = '1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7_';
  const url = `https://docs.google.com/spreadsheets/d/${id}/edit#gid=0`;
  assert.equal(parseSpreadsheetId(url), id);
});

test('isValidSpreadsheetId enforces length and characters', () => {
  const valid = '1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7_';
  assert.ok(isValidSpreadsheetId(valid));
  assert.equal(isValidSpreadsheetId('short'), false);
});
