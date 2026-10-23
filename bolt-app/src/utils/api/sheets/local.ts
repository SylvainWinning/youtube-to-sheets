import type { VideoData } from '../../../types/video.ts';
import type { ApiResponse } from './types.ts';
import { fetchJsonWithRetry, REQUEST_POLICY, throwIfAborted } from '../../requestPolicy.ts';
import { transformVideoRows } from './transform.ts';
import { readVideoSnapshot, readSyncMetadata } from './schema.ts';

export async function fetchLocalVideos(signal?: AbortSignal, beforeAttempt?: () => void): Promise<ApiResponse<VideoData[]>> {
  try {
    const baseUrl = import.meta.env?.BASE_URL ?? '';
    const url = `${baseUrl}data/videos.json`;
    let modified = NaN;
    const json = await fetchJsonWithRetry<unknown>(url, {
      signal, policy: { ...REQUEST_POLICY, maxAttempts: 1, totalTimeoutMs: 5_000 },
      onAttempt: beforeAttempt,
      // Revalidate the stable URL using the browser's cached body and validators.
      init: { cache: 'no-cache' },
      onResponse: response => {
        const value = response.headers.get('Last-Modified');
        const parsed = Date.parse(value ?? '');
        modified = Number.isFinite(parsed) && new Date(parsed).toUTCString() === value ? parsed : NaN;
      },
    });
    const snapshot = readVideoSnapshot(json);
    const videos = transformVideoRows(snapshot.rows);
    if (videos.length === 0) throw new Error('La copie locale ne contient aucune vidéo valide');
    const sync = videos.length === snapshot.rows.length ? readSyncMetadata(snapshot.metadata, videos) : undefined;
    return {
      data: videos,
      metadata: {
        source: 'local',
        sync,
        ...(videos.length < snapshot.rows.length ? { warnings: ['Certaines lignes de la copie locale sont invalides.'] } : {}),
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
