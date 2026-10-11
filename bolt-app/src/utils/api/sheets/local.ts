import type { VideoData } from '../../../types/video.ts';
import type { ApiResponse } from './types.ts';
import { fetchJsonWithRetry, REQUEST_POLICY, throwIfAborted } from '../../requestPolicy.ts';
import { validateRow } from './validation.ts';
import { mapRowToVideo } from './transform.ts';

export async function fetchLocalVideos(signal?: AbortSignal, beforeAttempt?: () => void): Promise<ApiResponse<VideoData[]>> {
  try {
    const baseUrl = (import.meta as any).env?.BASE_URL ?? '';
    const url = `${baseUrl}data/videos.json?t=${Date.now()}`;
    let modified = NaN;
    const json = await fetchJsonWithRetry<unknown>(url, {
      signal, policy: { ...REQUEST_POLICY, maxAttempts: 1, totalTimeoutMs: 5_000 },
      onAttempt: beforeAttempt,
      init: { cache: 'no-store' },
      onResponse: response => { modified = Date.parse(response.headers.get('Last-Modified') ?? ''); },
    });
    if (!Array.isArray(json) || !json.every(Array.isArray)) {
      throw new Error('Format de la copie locale invalide');
    }
    const [, ...rows] = json as any[][]; // skip header row
    const videos = rows
      .filter(validateRow)
      .map((row, index) => mapRowToVideo(row, index));

    if (videos.length === 0) throw new Error('La copie locale ne contient aucune vidéo valide');
    return {
      data: videos,
      metadata: {
        source: 'local',
        timestamp: Date.now(),
        ...(Number.isFinite(modified) ? { publishedAt: modified } : {})
      }
    };
  } catch (err) {
    throwIfAborted(signal);
    console.error('Erreur lors du chargement des vidéos locales:', err);
    return {
      data: [],
      error: err instanceof Error
        ? err.message
        : 'Erreur lors du chargement des vidéos locales'
    };
  }
}
