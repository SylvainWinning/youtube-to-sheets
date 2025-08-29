import type { SheetTab } from '../types/sheets';

export const SHEET_TABS: SheetTab[] = [
  { name: '0-5min', range: '0-5min!A2:M', durationRange: { min: 0, max: 5 } },
  { name: '5-10min', range: '5-10min!A2:M', durationRange: { min: 5, max: 10 } },
  { name: '10-20min', range: '10-20min!A2:M', durationRange: { min: 10, max: 20 } },
  { name: '20-30min', range: '20-30min!A2:M', durationRange: { min: 20, max: 30 } },
  { name: '30-40min', range: '30-40min!A2:M', durationRange: { min: 30, max: 40 } },
  { name: '40-50min', range: '40-50min!A2:M', durationRange: { min: 40, max: 50 } },
  { name: '50-60min', range: '50-60min!A2:M', durationRange: { min: 50, max: 60 } },
  { name: '60Plusmin', range: '60Plusmin!A2:M', durationRange: { min: 60, max: null } },
  { name: 'Inconnue', range: 'Inconnue!A2:M', durationRange: { min: null, max: null } },
];

const env = (import.meta as any).env ?? (globalThis as any).process?.env ?? {};

export const SPREADSHEET_ID = env.VITE_SPREADSHEET_ID ?? env.SPREADSHEET_ID ?? env.REACT_APP_SPREADSHEET_ID ?? '';
export const API_KEY = env.VITE_API_KEY ?? env.API_KEY ?? env.REACT_APP_API_KEY ?? '';


export function isValidSpreadsheetId(id: string): boolean {
  return /^[A-Za-z0-9-_]{40,60}$/.test(id);
}

export function getConfig(): {
  SPREADSHEET_ID: string;
  API_KEY: string;
  error?: string;
} {
  if (!isValidSpreadsheetId(SPREADSHEET_ID)) {
    const error = 'SPREADSHEET_ID invalide';
    console.error(error);
    return { SPREADSHEET_ID: '', API_KEY: '', error };
  }
  if (!API_KEY) {
    const error = 'API_KEY manquant';
    console.error(error);
    return { SPREADSHEET_ID: '', API_KEY: '', error };
  }
  return { SPREADSHEET_ID, API_KEY };
}
