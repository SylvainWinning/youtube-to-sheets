import type { VideoData } from '../../../types/video.ts';
import type { ApiResponse } from './types.ts';
import { validateRow } from './validation.ts';
import { mapRowToVideo } from './transform.ts';

export async function fetchLocalVideos(): Promise<ApiResponse<VideoData[]>> {
  try {
const baseUrl = (import.meta as any).env?.BASE_URL ?? '';
    const res = await fetch(`${baseUrl}data/videos.json`);    
    const json = await res.json();
    const [, ...rows] = json as any[][]; // skip header row
    const videos = rows
      .filter(validateRow)
      .map(mapRowToVideo);

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
