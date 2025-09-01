import { dev } from '$app/environment';

/**
 * Extrait un paramètre de requête depuis l’URL.
 */
function getParamFromUrl(name: string): string {
  const params = new URLSearchParams(globalThis.location?.search ?? '');
  return params.get(name) ?? '';
}

/**
 * Analyse une URL Google Sheets ou renvoie l’ID si elle est déjà fournie directement.
 */
function parseSpreadsheetId(idOrUrl: string): string {
  const match = idOrUrl.match(/^[A-Za-z0-9-_]{25,60}$/);
  if (match) return idOrUrl;
  try {
    const url = new URL(idOrUrl);
    const parts = url.pathname.split('/');
    const dIndex = parts.indexOf('d');
    if (dIndex >= 0 && parts.length > dIndex + 1) {
      return parts[dIndex + 1];
    }
  } catch {
    // ignore
  }
  return '';
}

/**
 * Fusionne les variables d’environnement exposées par Vite et par Node.
 * Vite injecte les variables dans import.meta.env au build, tandis que Node les stocke dans process.env.
 */
const env = {
  // Variables injectées par Vite lors du build
  ...((import.meta as any)?.env ?? {}),
  // Variables Node pour l’exécution côté serveur ou scripts
  ...((typeof process !== 'undefined' ? (process as any).env : {})),
};

const spreadsheetIdParam = getParamFromUrl('spreadsheetId');
const apikeyParam = getParamFromUrl('apiKey');

/**
 * Détermine l’ID brut de la feuille de calcul en privilégiant le paramètre d’URL puis les variables d’environnement.
 * Si rien n’est fourni, une valeur par défaut est utilisée ; si cette valeur est vide, une erreur de configuration surviendra plus loin.
 */
const rawSpreadsheetId =
  spreadsheetIdParam ||
  env.SPREADSHEET_ID ||
  env.VITE_SPREADSHEET_ID ||
  '1ltnNUqmBjkCLmePBJgM5U3yf_CU44vDucDQ9Gq8FNzU';

export const SPREADSHEET_ID = parseSpreadsheetId(rawSpreadsheetId);

/**
 * Calcule la clé API. Un paramètre d’URL a toujours la priorité sur la variable d’environnement.
 */
export const API_KEY =
  apikeyParam ||
  env.YOUTUBE_API_KEY ||
  '';

/**
 * Valide un ID de feuille Google. Un ID valide contient uniquement des caractères alphanumériques,
 * des tirets ou des underscores, et a une longueur comprise entre 25 et 60 caractères.
 * Cela ne garantit pas que la feuille existe, mais seulement que le format est plausible.
 */
export function isValidSpreadsheetId(id: string): boolean {
  return /^[A-Za-z0-9-_]{25,60}$/.test(id);
}

/**
 * Retourne l’objet de configuration consommé par le reste de l’application.
 * Si des champs requis sont manquants ou invalides, une chaîne `error` est renvoyée
 * en plus de valeurs vides. Ce message peut être affiché à l’utilisateur pour l’aider à diagnostiquer les problèmes de configuration.
 */
export function getConfig(): {
  SPREADSHEET_ID: string;
  API_KEY: string;
  error?: string;
  help?: string;
} {
  // Si l’ID est vide, proposer à l’utilisateur de le saisir
  if (!SPREADSHEET_ID) {
    let userInput = '';
    if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
      userInput = parseSpreadsheetId(window.prompt("Veuillez saisir l'ID du Google Sheet :") || '');
    }
    return {
      SPREADSHEET_ID: userInput,
      API_KEY,
      help: "SPREADSHEET_ID manquant : définissez SPREADSHEET_ID ou VITE_SPREADSHEET_ID, ou saisissez-le dans la boîte de dialogue.",
    };
  }

  // Signale explicitement un ID invalide
  if (!isValidSpreadsheetId(SPREADSHEET_ID)) {
    const error = 'SPREADSHEET_ID invalide';
    return { SPREADSHEET_ID: '', API_KEY, error };
  }

  // Si la clé API est manquante, signale-le explicitement
  if (!API_KEY) {
    const error = "API_KEY manquant : définissez YOUTUBE_API_KEY ou ?apiKey= dans l’URL.";
    return { SPREADSHEET_ID: '', API_KEY: '', error };
  }

  // Configuration valide
  return { SPREADSHEET_ID, API_KEY };
}
