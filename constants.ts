import type { SheetTab } from '../types/sheets';

/**
 * Definition of all known sheet tabs. Each tab corresponds to a duration
 * interval and maps to a particular range within the Google Sheet. The
 * `durationRange` property is used by the UI to filter videos by length.
 */
export const SHEET_TABS: SheetTab[] = [
  { name: '0-5min', range: '0-5min!A2:M', durationRange: { min: 0, max: 5 } },
  { name: '5-10min', range: '5-10min!A2:M', durationRange: { min: 5, max: 10 } },
  { name: '10-20min', range: '10-20min!A2:M', durationRange: { min: 10, max: 20 } },
  { name: '20-30min', range: '20-30min!A2:M', durationRange: { min: 20, max: 30 } },
  { name: '30-40min', range: '30-40min!A2:M', durationRange: { min: 30, max: 40 } },
  { name: '40-50min', range: '40-50min!A2:M', durationRange: { min: 40, max: 50 } },
  { name: '50-60min', range: '50-60min!A2:M', durationRange: { min: 50, max: 60 } },
  { name: '60Plusmin', range: '60Plusmin!A2:M', durationRange: { min: 60, max: null } },
  { name: 'Inconnue', range: 'Inconnue!A2:M', durationRange: { min: null, max: null } }
];

// Vite et Node exposent les variables d’environnement à des endroits
// différents. On lit d’abord `import.meta.env` (Vite), puis on se replie sur
// `process.env` (Node).
const env = {
  ...(globalThis as any).process?.env ?? {},
  ...(import.meta as any).env ?? {},
};

/**
 * Extracts the spreadsheet ID from a full Google Sheets URL. If the input
 * already resembles an ID (consisting solely of allowed characters), it
 * returns it unchanged. Leading/trailing whitespace is always trimmed.
 */
export function parseSpreadsheetId(input: string): string {
  const match = input?.match(/\/spreadsheets\/d\/([A-Za-z0-9-_]{25,60})/);
  const id = match ? match[1] : (input ?? '');
  return id.trim();
}

/**
 * Derives the spreadsheet ID and API key by first looking at the current URL
 * query parameters (`?spreadsheetId=...&apiKey=...`) and then falling back to
 * environment variables. This allows testers to quickly override the
 * configuration in the browser without modifying the build. The values are
 * parsed and validated before being returned.
 */
function deriveConfigFromParams() {
  let spreadsheetIdParam: string | null = null;
  let apiKeyParam: string | null = null;

  // In a browser environment, use the URLSearchParams API to extract query
  // parameters. Guard against SSR by checking typeof window.
  if (typeof window !== 'undefined' && window.location) {
    const params = new URLSearchParams(window.location.search);
    spreadsheetIdParam = params.get('spreadsheetId');
    apiKeyParam = params.get('apiKey');
  }

  // Always parse the ID to support full URLs in the query parameter. An
  // undefined or empty string will remain empty after parsing.
  const parsedId = spreadsheetIdParam ? parseSpreadsheetId(spreadsheetIdParam) : '';
  return {
    spreadsheetIdParam: parsedId,
    apiKeyParam: apiKeyParam ?? ''
  };
}

const { spreadsheetIdParam, apiKeyParam } = deriveConfigFromParams();

// Determine the raw spreadsheet ID by preferring the query parameter over
// the environment variable. Si rien n’est fourni, la chaîne sera vide et
// provoquera une erreur de configuration plus loin.
const rawSpreadsheetId =
  spreadsheetIdParam ||
  env.SPREADSHEET_ID ||
  '';

export const SPREADSHEET_ID = parseSpreadsheetId(rawSpreadsheetId);

// Derive the API key. A query parameter always overrides the environment
// variable.
export const API_KEY =
  apiKeyParam ||
  env.YOUTUBE_API_KEY ||
  '';

/**
 * Validates a spreadsheet ID. A valid ID contains only alphanumeric
 * characters, hyphens, or underscores and has a length between 25 and 60
 * characters. This does not guarantee the sheet exists, only that the format
 * is plausible.
 */
export function isValidSpreadsheetId(id: string): boolean {
  return /^[A-Za-z0-9-_]{25,60}$/.test(id);
}

/**
 * Returns the final configuration object consumed by the rest of the app. If
 * required fields are missing or invalid, an `error` string is returned
 * alongside empty values. This message can be displayed to the user to help
 * diagnose configuration issues.
 */
export function getConfig(): {
  SPREADSHEET_ID: string;
  API_KEY: string;
  error?: string;
  help?: string;
} {
  // If the ID is empty, provide a gentle hint instead of logging an error.
  if (!SPREADSHEET_ID) {
    let userInput = '';
    if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
      userInput = parseSpreadsheetId(window.prompt('Veuillez saisir l\'ID du Google Sheet :') || '');
    }
    return {
      SPREADSHEET_ID: userInput,
      API_KEY,
      help: "SPREADSHEET_ID manquant : définissez SPREADSHEET_ID, utilisez ?spreadsheetId= ou saisissez-le dans la boîte de dialogue.",
    };
  }
  // If the ID contains characters outside the allowed set, flag it as invalid.
  if (!isValidSpreadsheetId(SPREADSHEET_ID)) {
    const error = 'SPREADSHEET_ID invalide';
    console.error(error);
    return { SPREADSHEET_ID: '', API_KEY: '', error };
  }
  // If the API key is missing, signal it explicitly. Mention the supported
  // environment variable names to help repository owners configure secrets correctly.
  if (!API_KEY) {
    const error = 'API_KEY manquant : définissez YOUTUBE_API_KEY ou utilisez ?apiKey=';
    console.error(error);
    return { SPREADSHEET_ID: '', API_KEY: '', error };
  }
  return { SPREADSHEET_ID, API_KEY };
}