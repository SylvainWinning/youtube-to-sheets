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

// Vite and Node both expose environment variables in different places. We
// attempt to read from import.meta.env first (Vite), then fall back to
// process.env (Node) for completeness. Note that only variables prefixed
// with VITE_ are exposed to the client in a Vite build.
const env = (import.meta as any).env ?? (globalThis as any).process?.env ?? {};

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
// environment variables. Accept both `VITE_SPREADSHEET_ID` and un-prefixed
// versions for convenience. If nothing is provided, the string will be
// empty and will trigger a configuration error later.
const rawSpreadsheetId =
  // Prefer the ID from the query string over any environment variable.  In
  // production builds, only variables prefixed with VITE_ are exposed to
  // the client, but we also support un‑prefixed names for convenience when
  // running locally or injecting via GitHub secrets.  The SPREADSHEET_ID
  // secret defined in this repository will be captured here.
  spreadsheetIdParam ||
  env.VITE_SPREADSHEET_ID ||
  env.SPREADSHEET_ID ||
  env.REACT_APP_SPREADSHEET_ID ||
  '';

export const SPREADSHEET_ID = parseSpreadsheetId(rawSpreadsheetId);

// Derive the API key. When deploying via GitHub Actions, the secret is
// injected as an environment variable without the VITE_ prefix. We therefore
// check the two supported names. A query parameter always overrides
// environment variables.
export const API_KEY =
  apiKeyParam ||
  env.VITE_YOUTUBE_API_KEY ||
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
} {
  // If the ID is empty, mark it as missing.
  if (!SPREADSHEET_ID) {
    const error = 'SPREADSHEET_ID manquant : définissez VITE_SPREADSHEET_ID ou utilisez ?spreadsheetId=';
    console.error(error);
    return { SPREADSHEET_ID: '', API_KEY: '', error };
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
    const error =
      'API_KEY manquant : définissez VITE_YOUTUBE_API_KEY ou YOUTUBE_API_KEY, ou utilisez ?apiKey=';
    console.error(error);
    return { SPREADSHEET_ID: '', API_KEY: '', error };
  }
  return { SPREADSHEET_ID, API_KEY };
}