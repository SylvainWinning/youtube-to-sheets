import type { VideoData } from '../../../types/video.ts';
import type { ApiResponse } from './types.ts';
import { synchronizeSheets } from './sync.ts';
import { fetchLocalVideos } from './local.ts';
import { getConfig } from '../../constants.ts';

export { fetchLocalVideos };

/**
 * Récupère toutes les vidéos.
 *
 * - Si la configuration est incomplète ou invalide (SPREADSHEET_ID manquant, aide ou erreur),
 *   on lit les vidéos locales situées dans `data/videos.json`.
 * - Sinon, on tente de synchroniser avec Google Sheets.
 */
export async function fetchAllVideos(): Promise<ApiResponse<VideoData[]>> {
  const localResponse = await fetchLocalVideos();
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
      // On conserve l'erreur d'origine seulement si elle existe ; sinon, on garde l'erreur locale
      error: config.error ?? localResponse.error,
      metadata: {
        // On fusionne les messages d'erreurs existants et, le cas échéant, l'erreur de configuration
        errors: [
          ...(localResponse.metadata?.errors ?? []),
          ...(config.error ? [config.error] : []),
          ...(localResponse.error ? [localResponse.error] : [])
        ],
        timestamp: Date.now()
      }
    };
  }

  try {
    const videos = await synchronizeSheets();

    return {
      data: videos,
      metadata: {
        timestamp: Date.now()
      }
    };
  } catch (error) {
    console.error('Error fetching videos:', error);

    if (localResponse.error) {
      throw new Error(localResponse.error);
    }

    return {
      ...localResponse,
      metadata: {
        ...(localResponse.metadata ?? {}),
        errors: [
          ...(localResponse.metadata?.errors ?? []),
          error instanceof Error ? error.message : 'Erreur inconnue'
        ],
        timestamp: Date.now()
      }
    };
  }
}
