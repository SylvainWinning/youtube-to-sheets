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

const env = {
  ...(globalThis as any).process?.env ?? {},
  ...(import.meta as any).env ?? {},
};

/**
 * Extrait l’ID du classeur à partir d’une URL complète ou renvoie la chaîne fournie.
 * On applique toujours trim() pour éliminer les espaces ou retours à la ligne.
 */
export function parseSpreadsheetId(input: string): string {
  const match = input?.match(/\/spreadsheets\/d\/([A-Za-z0-9-_]{25,60})/);
  const id = match ? match[1] : (input ?? '');
  return id.trim();
}

function deriveConfigFromParams() {
  let spreadsheetIdParam: string | null = null;
  let apiKeyParam: string | null = null;

  if (typeof window !== 'undefined' && window.location) {
    const params = new URLSearchParams(window.location.search);
    spreadsheetIdParam = params.get('spreadsheetId');
    apiKeyParam = params.get('apiKey');
  }

  const parsedId = spreadsheetIdParam ? parseSpreadsheetId(spreadsheetIdParam) : '';
  return {
    spreadsheetIdParam: parsedId,
    apiKeyParam: apiKeyParam ?? ''
  };
}

const { spreadsheetIdParam, apiKeyParam } = deriveConfigFromParams();

const rawSpreadsheetId =
  spreadsheetIdParam ||
  env.SPREADSHEET_ID ||
  '';

export const SPREADSHEET_ID = parseSpreadsheetId(rawSpreadsheetId);

export const API_KEY =
  apiKeyParam ||
  env.YOUTUBE_API_KEY ||
  '';

/**
 * Valide l’ID : il doit contenir au moins un caractère et ne comporter que
 * des lettres, chiffres, tirets ou soulignés.
 */
export function isValidSpreadsheetId(id: string): boolean {
  return /^[A-Za-z0-9-_]{25,60}$/.test(id);
}

export function getConfig(): {
  SPREADSHEET_ID: string;
  API_KEY: string;
  error?: string;
  help?: string;
} {
  // Si l’ID est vide, on propose une saisie utilisateur sans consigner d’erreur.
  i  if (!SPREADSHEET_ID) {
    return {
      SPREADSHEET_ID: '',
      API_KEY,
      error: "SPREADSHEET_ID manquant : définissez SPREADSHEET_ID ou utilisez '?spreadsheetId=' dans l'URL.",
    };
  }

  // Si l’ID n’est pas composé uniquement de caractères valides, on le signale comme invalide.
  if (!isValidSpreadsheetId(SPREADSHEET_ID)) {
    const error = 'SPREADSHEET_ID invalide';
    return { SPREADSHEET_ID: '', API_KEY: '', error };
  }
  // Si la clé API est absente, on l’indique.
  if (!API_KEY) {
    const error = 'API_KEY manquant : définissez YOUTUBE_API_KEY ou utilisez ?apiKey=';
    return { SPREADSHEET_ID: '', API_KEY: '', error };
  }
  // Retourne la configuration correcte.
  return { SPREADSHEET_ID, API_KEY };
}
