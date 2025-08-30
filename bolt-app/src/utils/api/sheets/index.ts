import type { VideoData } from '../../../types/video.ts';
import type { ApiResponse } from './types.ts';
import { synchronizeSheets } from './sync.ts';
import { fetchLocalVideos } from './local.ts';

export { fetchLocalVideos };

export async function fetchAllVideos(): Promise<ApiResponse<VideoData[]>> {
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
