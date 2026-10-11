import type { VideoData } from '../../../types/video.ts';
import type { ApiResponse } from './types.ts';
import { synchronizeSheets } from './sync.ts';
import { fetchLocalVideos } from './local.ts';
import { createAbortScope, LOAD_TIMEOUT_MS, LOAD_MAX_ATTEMPTS, throwIfAborted } from '../../requestPolicy.ts';
import { getConfig } from '../../constants.ts';

export { fetchLocalVideos };

/**
 * Récupère toutes les vidéos.
 *
 * - Si la configuration est incomplète ou invalide (SPREADSHEET_ID manquant, aide ou erreur),
 *   on lit les vidéos locales situées dans `data/videos.json`.
 * - Sinon, on tente de synchroniser avec Google Sheets.
 */
export async function fetchAllVideos(signal?: AbortSignal): Promise<ApiResponse<VideoData[]>> {
  const scope = createAbortScope(signal, LOAD_TIMEOUT_MS);
  let attempts = 0;
  const beforeAttempt = () => {
    throwIfAborted(scope.signal);
    if (attempts >= LOAD_MAX_ATTEMPTS) {
      scope.abort(new DOMException('Budget de requêtes épuisé', 'QuotaExceededError'));
      throwIfAborted(scope.signal);
    }
    attempts++;
  };
  try {
    const localResponse = await fetchLocalVideos(scope.signal, beforeAttempt);
    const config = getConfig();

    // Si une erreur est détectée ou si un message d'aide est présent,
    // on se rabat sur les données locales au lieu d'interroger les API externes.
    if (config.error || config.help) {
      if (config.error) {
        console.error('Configuration error:', config.error);
      }
      if (config.help) {
        console.warn('Configuration help:', config.help);
      }

      return {
        ...localResponse,
        metadata: {
          ...localResponse.metadata,
          source: 'local',
          timestamp: localResponse.metadata?.timestamp ?? Date.now(),
          ...(config.error ? { warnings: [config.error] } : {})
        }
      };
    }

    try {
      const videos = await synchronizeSheets(scope.signal, beforeAttempt);

      return {
        data: videos,
        metadata: {
          source: 'sheets',
          timestamp: Date.now()
        }
      };
    } catch (error) {
      throwIfAborted(signal);
      console.error('Error fetching videos:', error);

      return {
        ...localResponse,
        metadata: {
          ...(localResponse.metadata ?? {}),
          warnings: [
            ...(localResponse.metadata?.warnings ?? []),
            error instanceof Error ? error.message : 'Erreur inconnue'
          ],
          source: 'local',
          timestamp: localResponse.metadata?.timestamp ?? Date.now()
        }
      };
    }
  } finally {
    scope.dispose();
  }
}
