import type { SheetTab } from '../types/sheets';

// Définition des onglets et plages de durée pour la synchronisation des vidéos.
// Chaque entrée représente un onglet dans le classeur Google Sheets avec une
// plage nommée et un intervalle de durée associé. Ces valeurs sont utilisées
// pour filtrer et afficher les vidéos dans l'interface utilisateur.
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

// Collecte des variables d'environnement exposées par Vite ou par la plateforme
// d'exécution. Ces objets peuvent contenir les variables SPREADSHEET_ID et
// YOUTUBE_API_KEY fournies au moment du build ou via un fichier `.env`.
const env = {
  ...(globalThis as any).process?.env ?? {},
  ...(import.meta as any).env ?? {},
};

/**
 * Extrait l'identifiant du classeur depuis une URL complète ou retourne la
 * chaîne fournie. La fonction applique toujours `trim()` pour éliminer
 * d'éventuels espaces ou retours à la ligne en début ou fin de chaîne.
 */
export function parseSpreadsheetId(input: string): string {
  const match = input?.match(/\/spreadsheets\/d\/([A-Za-z0-9-_]{25,60})/);
  const id = match ? match[1] : (input ?? '');
  return id.trim();
}

/**
 * Analyse les paramètres de l'URL (`?spreadsheetId=` et `?apiKey=`) pour
 * récupérer des valeurs de configuration fournies dynamiquement. Ces
 * paramètres peuvent être utilisés pour tester rapidement l'application sans
 * modifier les variables d'environnement.
 */
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
    apiKeyParam: apiKeyParam ?? '',
  };
}

// Décomposition des paramètres d'URL pour une utilisation ultérieure.
const { spreadsheetIdParam, apiKeyParam } = deriveConfigFromParams();

// Calcul de l'ID de feuille brute en privilégiant l'URL, puis l'environnement.
const rawSpreadsheetId = spreadsheetIdParam || env.SPREADSHEET_ID || '';

// Conversion de l'identifiant potentiel en ID propre en utilisant la fonction
// `parseSpreadsheetId` ci‑dessus.
export const SPREADSHEET_ID = parseSpreadsheetId(rawSpreadsheetId);

// Récupération de la clé API YouTube, soit via l'URL, soit via la variable
// d'environnement. Si rien n'est fourni, la chaîne est vide.
export const API_KEY = apiKeyParam || env.YOUTUBE_API_KEY || '';

/**
 * Valide l'ID du classeur. Un ID valide est une chaîne de 25 à 60
 * caractères composée de lettres, chiffres, tirets ou soulignés.
 */
export function isValidSpreadsheetId(id: string): boolean {
  return /^[A-Za-z0-9-_]{25,60}$/.test(id);
}

/**
 * Obtient la configuration de l'application, en renvoyant les variables
 * nécessaires et en signalant les erreurs éventuelles. Contrairement à
 * l'implémentation d'origine, cette version ne demande plus à l'utilisateur
 * de saisir l'ID via une boîte de dialogue (`window.prompt`). Si aucun
 * identifiant n'est trouvé, une erreur est renvoyée pour que l'interface
 * affiche un message d'absence de configuration et bascule sur les données
 * locales.
 */
export function getConfig(): {
  SPREADSHEET_ID: string;
  API_KEY: string;
  error?: string;
  help?: string;
} {
  // L'ID n'est pas défini : retour d'une erreur descriptive. Aucune
  // interaction avec l'utilisateur n'est déclenchée, ce qui évite une
  // fenêtre pop‑up bloquante lors du chargement de l'application.
  if (!SPREADSHEET_ID) {
    return {
      SPREADSHEET_ID: '',
      API_KEY,
      eerror: '',
    };
  };
}
  // L'ID est fourni mais ne respecte pas le format attendu : retourne une
  // erreur pour éviter de lancer des requêtes inutiles.
  if (!isValidSpreadsheetId(SPREADSHEET_ID)) {
    const error = 'SPREADSHEET_ID invalide';
    return { SPREADSHEET_ID: '', API_KEY: '', error };
  }

  // Absence de clé API : signale également une erreur afin d'informer
  // l'utilisateur qu'il doit fournir `YOUTUBE_API_KEY` ou utiliser `?apiKey=`.
  if (!API_KEY) {
    const error = "API_KEY manquant : définissez YOUTUBE_API_KEY ou utilisez '?apiKey='";
    return { SPREADSHEET_ID: '', API_KEY: '', error };
  }

  // Toutes les valeurs requises sont présentes et valides : renvoie la
  // configuration sans erreur.
  return { SPREADSHEET_ID, API_KEY };
}
