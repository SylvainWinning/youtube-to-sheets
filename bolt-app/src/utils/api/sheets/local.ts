import type { VideoData } from '../../../types/video.ts';
import type { ApiResponse } from './types.ts';
import { validateRow } from './validation.ts';
import { mapRowToVideo } from './transform.ts';

export async function fetchLocalVideos(): Promise<ApiResponse<VideoData[]>> {
  try {
    const baseUrl = (import.meta as any).env?.BASE_URL ?? '';
    const url = `${baseUrl}data/videos.json?t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json) || !json.every(Array.isArray)) {
      throw new Error('Format de la copie locale invalide');
    }
    const [, ...rows] = json as any[][]; // skip header row
    const videos = rows
      .filter(validateRow)
      .map((row, index) => mapRowToVideo(row, index));

    if (videos.length === 0) throw new Error('La copie locale ne contient aucune vidéo valide');
    const modified = Date.parse(res.headers.get('Last-Modified') ?? '');
    return {
      data: videos,
      metadata: {
        source: 'local',
        timestamp: Date.now(),
        ...(Number.isFinite(modified) ? { publishedAt: modified } : {})
      }
    };
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
