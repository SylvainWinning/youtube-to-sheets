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
const searchParams =
  typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : undefined;

/**
 * Extrait l’ID du classeur à partir d’une URL complète ou renvoie la chaîne fournie.
 * On applique toujours trim() pour éliminer les espaces ou retours à la ligne.
 */
export function parseSpreadsheetId(input: string): string {
  const match = input?.match(/\/spreadsheets\/d\/([A-Za-z0-9-_]{25,90})/);
  const id = match ? match[1] : (input ?? '');
  return id.trim();
}

function getRawSpreadsheetId(envObj: any, params?: URLSearchParams): string {
  return (
    envObj.VITE_SPREADSHEET_ID ??
    envObj.SPREADSHEET_ID ??
    envObj.REACT_APP_SPREADSHEET_ID ??
    params?.get('spreadsheetId') ??
    ''
  );
}

function getRawApiKey(envObj: any, params?: URLSearchParams): string {
  return (
    envObj.VITE_API_KEY ??
    envObj.API_KEY ??
    envObj.REACT_APP_API_KEY ??
    params?.get('apiKey') ??
    ''
  );
}

const rawSpreadsheetId = getRawSpreadsheetId(env, searchParams);
export const SPREADSHEET_ID = parseSpreadsheetId(rawSpreadsheetId);
export const API_KEY = getRawApiKey(env, searchParams);

/**
 * Valide l’ID : il doit contenir au moins un caractère et ne comporter que
 * des lettres, chiffres, tirets ou soulignés.
 */
export function isValidSpreadsheetId(id: string): boolean {
  return /^[A-Za-z0-9-_]{25,90}$/.test(id);
}

export function buildConfig(envObj: any, search?: string): {
  SPREADSHEET_ID: string;
  API_KEY: string;
  error?: string;
} {
  const params = new URLSearchParams(search ?? '');
  const rawId = getRawSpreadsheetId(envObj, params);
  const rawKey = getRawApiKey(envObj, params);

  const SPREADSHEET_ID = parseSpreadsheetId(rawId);
  const API_KEY = rawKey.trim();

  if (!SPREADSHEET_ID) {
    const error =
      'SPREADSHEET_ID manquant : définissez VITE_SPREADSHEET_ID ou ?spreadsheetId=';
    console.error(error);
    return { SPREADSHEET_ID: '', API_KEY: '', error };
  }

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

export function getConfig(): {
  SPREADSHEET_ID: string;
  API_KEY: string;
  error?: string;
} {
  const search = typeof window !== 'undefined' ? window.location.search : undefined;
  return buildConfig(env, search);
}