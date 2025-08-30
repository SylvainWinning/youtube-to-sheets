import type { VideoData } from '../../../types/video.ts';
import type { ApiResponse } from './types.ts';
import { synchronizeSheets } from './sync.ts';
import { fetchLocalVideos } from './local.ts';
import { getConfig } from '../../constants.ts';

export { fetchLocalVideos };

export async function fetchAllVideos(): Promise<ApiResponse<VideoData[]>> {
  const config = getConfig();

  if (config.error) {
    const localResponse = await fetchLocalVideos();
    return {
      ...localResponse,
      error: config.error,
      metadata: {
        errors: [
          ...(localResponse.metadata?.errors ?? []),
          config.error,
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
    return {
      data: [],
      error: 'Une erreur est survenue lors de la récupération des données',
      metadata: {
        errors: [error instanceof Error ? error.message : 'Erreur inconnue'],
        timestamp: Date.now()
      }
    };
  }
}
