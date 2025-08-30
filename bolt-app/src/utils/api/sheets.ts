import { VideoData, VideoResponse } from '../../types/video';
import { SHEET_TABS, getConfig } from '../constants';

interface SheetError {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

async function fetchSheetData(
  range: string,
  spreadsheetId: string,
  apiKey: string
): Promise<any[]> {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errorData: SheetError = await response.json();
      throw new Error(errorData.error?.message || `Erreur HTTP: ${response.status}`);
    }

    const data = await response.json();

    if (!data.values) {
      console.warn(`Aucune donnée trouvée pour l'onglet: ${range}`);
      return [];
    }

    return data.values;
  } catch (error) {
    console.error('Erreur lors de la récupération des données:', error);
    throw error;
  }
}

function validateVideoData(row: any[]): boolean {
  return (
    Array.isArray(row) &&
    row.length >= 13 &&
    typeof row[0] === 'string' && // Avatar de la chaîne
    typeof row[1] === 'string' && // Titre
    typeof row[2] === 'string' && // Lien
    row[1].trim() !== '' &&
    row[2].trim().startsWith('http')
  );
}

function mapRowToVideo(row: any[]): VideoData {
  return {
    channelAvatar: String(row[0] || ''),
    title: String(row[1] || ''),
    link: String(row[2] || ''),
    channel: String(row[3] || ''),
    publishedAt: String(row[4] || ''),
    duration: String(row[5] || '00:00'),
    views: String(row[6] || '0'),
    likes: String(row[7] || '0'),
    comments: String(row[8] || '0'),
    shortDescription: String(row[9] || ''),
    tags: String(row[10] || ''),
    category: String(row[11] || ''),
    thumbnail: String(row[12] || '')
  };
}

export async function fetchLocalVideos(): Promise<VideoResponse> {
  try {
    const res = await fetch('/data/videos.json');
    const json = await res.json();
    const [, ...rows] = json as any[][]; // skip header row
    const videos = rows.filter(validateVideoData).map(mapRowToVideo);
    return { data: videos };
  } catch (err) {
    console.error('Erreur lors du chargement des vidéos locales:', err);
    return {
      data: [],
      error: err instanceof Error
        ? err.message
        : 'Erreur lors du chargement des vidéos locales'
    };
  }
}

export async function fetchAllVideos(): Promise<VideoResponse> {
  const { SPREADSHEET_ID, API_KEY, error } = getConfig();
  if (error) {
    return { data: [], error };
  }
  const errors: string[] = [];

  try {
    const allVideos: VideoData[] = [];
    const tabResults = await Promise.allSettled(
      SHEET_TABS.map(tab => fetchSheetData(tab.range, SPREADSHEET_ID, API_KEY))
    );

    tabResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const validRows = result.value.filter(validateVideoData);
        const videos = validRows.map(mapRowToVideo);
        allVideos.push(...videos);
      } else {
        const tabName = SHEET_TABS[index].name;
        console.error(`Erreur pour l'onglet ${tabName}:`, result.reason);
        errors.push(`Erreur lors de la récupération des données de l'onglet ${tabName}`);
      }
    });

    if (allVideos.length === 0 && errors.length > 0) {
      throw new Error(errors.join('\n'));
    }

    if (allVideos.length === 0) {
      console.warn('Aucune vidéo trouvée dans les onglets');
    }

    const response: VideoResponse = { data: allVideos };

    if (errors.length > 0) {
      response.metadata = {
        errors,
        timestamp: Date.now()
      };
    }

    return response;
  } catch (error) {
    console.error('Erreur globale:', error);
    return {
      data: [],
      error: error instanceof Error
        ? error.message
        : 'Une erreur est survenue lors de la récupération des données',
      metadata: errors.length > 0
        ? { errors, timestamp: Date.now() }
        : undefined
    };
  }
}
