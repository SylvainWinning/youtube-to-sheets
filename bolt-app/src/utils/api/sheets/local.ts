import type { VideoData } from '../../../types/video.ts';
import type { ApiResponse, SyncMetadata } from './types.ts';
import { fetchJsonWithRetry, REQUEST_POLICY, throwIfAborted } from '../../requestPolicy.ts';
import { validateRow } from './validation.ts';
import { mapRowToVideo } from './transform.ts';

export async function fetchLocalVideos(signal?: AbortSignal, beforeAttempt?: () => void): Promise<ApiResponse<VideoData[]>> {
  try {
    const baseUrl = (import.meta as any).env?.BASE_URL ?? '';
    const url = `${baseUrl}data/videos.json`;
    let modified = NaN;
    const json = await fetchJsonWithRetry<unknown>(url, {
      signal, policy: { ...REQUEST_POLICY, maxAttempts: 1, totalTimeoutMs: 5_000 },
      onAttempt: beforeAttempt,
      // Revalidate the stable URL using the browser's cached body and validators.
      init: { cache: 'no-cache' },
      onResponse: response => { modified = Date.parse(response.headers.get('Last-Modified') ?? ''); },
    });
    const envelope = json && typeof json === "object" && !Array.isArray(json) ? json as { videos?: unknown; metadata?: unknown } : null;
    const table = envelope?.videos ?? json;
    if (!Array.isArray(table) || !table.every(Array.isArray)) {
      throw new Error('Format de la copie locale invalide');
    }
    const [, ...rows] = table as any[][]; // skip header row
    const videos = rows
      .filter(validateRow)
      .map((row, index) => mapRowToVideo(row, index));

    if (videos.length === 0) throw new Error('La copie locale ne contient aucune vidéo valide');
    const raw = envelope?.metadata as Partial<SyncMetadata> | undefined;
    const sync = raw && ["complete", "degraded", "unknown"].includes(raw.status ?? "") && ["youtube", "mixed", "cache", "sheets"].includes(raw.source ?? "")
      && Number.isInteger(raw.videoCount) && raw.videoCount === new Set(videos.map(video => video.link)).size
      && (raw.lastSuccessfulSync == null || (typeof raw.lastSuccessfulSync === "string" && Number.isFinite(Date.parse(raw.lastSuccessfulSync))))
      && (raw.status !== "complete" || typeof raw.lastSuccessfulSync === "string")
      ? { status: raw.status, source: raw.source, videoCount: raw.videoCount, lastSuccessfulSync: raw.lastSuccessfulSync,
          ...(typeof raw.lastAttempt === "string" && Number.isFinite(Date.parse(raw.lastAttempt)) ? { lastAttempt: raw.lastAttempt } : {}) } as SyncMetadata : undefined;
    return {
      data: videos,
      metadata: {
        source: 'local',
        sync,
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
