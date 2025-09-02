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

/**
 * Internal helper to read environment variables. It works in both Node (process.env)
 * and browser contexts (import.meta.env) as used by Vite.
 */
function getEnvVar(key: string): string {
  // Node.js / vitest / GitHub Actions context
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return String(process.env[key] ?? '');
  }

  // Browser / Vite context
  const metaEnv = (import.meta as any)?.env ?? {};
  if (metaEnv && metaEnv[key]) {
    return String(metaEnv[key] ?? '');
  }

  return '';
}

/**
 * Raw values from the environment (may be empty strings). They are exported to keep
 * compatibility with existing imports; prefer using getConfig() for validation.
 */
export const SPREADSHEET_ID: string = getEnvVar('SPREADSHEET_ID');
export const YOUTUBE_API_KEY: string = getEnvVar('YOUTUBE_API_KEY');
/** Backwards‑compatible alias used in fetch.ts */
export const API_KEY: string = YOUTUBE_API_KEY;

/**
 * Structure returned by getConfig() describing the current configuration.
 */
export interface Config {
  SPREADSHEET_ID: string;
  YOUTUBE_API_KEY: string;
  /** Present when the spreadsheet ID is missing; explains how to fix it */
  help?: string;
  /** Present when values are invalid or incomplete; describes the error */
  error?: string;
}

/**
 * Compute a validated configuration object based on environment variables.
 *
 * - If no SPREADSHEET_ID is provided, returns an object with an empty SPREADSHEET_ID
 *   and a help message describing how to configure it.
 * - If the provided spreadsheet ID is malformed, returns an error message.
 * - If the API key is missing, returns an error message.
 *
 * Consumers should inspect the returned object for `error` or `help` keys to determine
 * whether to proceed or display a message to the user.
 */
export function getConfig(): Config {
  const rawSheetId = getEnvVar('SPREADSHEET_ID') ?? '';
  const apiKey = getEnvVar('YOUTUBE_API_KEY') ?? '';
  const sheetId = rawSheetId ? parseSpreadsheetId(rawSheetId) : '';

  // Missing sheet ID: suggest adding it without flagging it as an error
  if (!rawSheetId) {
    return {
      SPREADSHEET_ID: '',
      YOUTUBE_API_KEY: apiKey,
      help: 'Veuillez définir SPREADSHEET_ID dans votre fichier .env pour spécifier l’identifiant de votre Google Sheets.',
    };
  }

  // Malformed ID: return an error
  if (sheetId && !isValidSpreadsheetId(sheetId)) {
    return {
      SPREADSHEET_ID: sheetId,
      YOUTUBE_API_KEY: apiKey,
      error: 'L’identifiant de la feuille Google (SPREADSHEET_ID) est invalide. Il doit contenir au moins 40 caractères (lettres, chiffres, tirets ou underscores).',
    };
    }

  // Missing API key: return an error
  if (!apiKey) {
    return {
      SPREADSHEET_ID: sheetId,
      YOUTUBE_API_KEY: '',
      error: 'YOUTUBE_API_KEY est manquant dans votre fichier .env. Veuillez fournir une clé API YouTube pour accéder à l’API.',
    };
  }

  // All good
  return {
    SPREADSHEET_ID: sheetId,
    YOUTUBE_API_KEY: apiKey,
  };
}
