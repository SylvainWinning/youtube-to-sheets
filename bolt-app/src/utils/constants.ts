import { SheetTab } from '../types/sheets';

/**
 * Predefined sheet tabs with ranges and duration ranges.
 */
export const SHEET_TABS: SheetTab[] = [
  {
    name: 'Toutes durées',
    range: 'A:Z',
    durationRange: { min: null, max: null },
  },
  {
    name: 'Courte',
    range: 'A:Z',
    durationRange: { min: 0, max: 5 },
  },
  {
    name: 'Moyenne',
    range: 'A:Z',
    durationRange: { min: 5, max: 10 },
  },
  {
    name: 'Longue',
    range: 'A:Z',
    durationRange: { min: 10, max: null },
  },
];

/**
 * Extracts the spreadsheet ID from a full Google Sheets URL or returns the ID itself.
 */
export function parseSpreadsheetId(input: string): string {
  // Match /d/{id}/ pattern in the URL
  const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    return match[1];
  }
  return input;
}

/**
 * Validates that the given string is a plausible Google Sheets ID.
 * It must consist of allowed characters and be at least 40 characters long.
 */
export function isValidSpreadsheetId(id: string): boolean {
  return /^[a-zA-Z0-9-_]{40,}$/.test(id);
}
