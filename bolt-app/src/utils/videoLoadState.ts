import type { LibraryVideo, VideoData } from '../types/video.ts';
import type { ApiResponse } from './api/sheets/types.ts';
import { assignCategories } from './assignCategories.ts';
import { buildVideoLibrary } from './videoLibrary.ts';

export interface VideoLoadState {
  videos: LibraryVideo[];
  error: string | null;
  warning: string | null;
  source: 'local' | 'sheets' | null;
  loadedAt: number | null;
  publishedAt?: number;
}

export const emptyVideoLoadState: VideoLoadState = {
  videos: [], error: null, warning: null, source: null, loadedAt: null,
};

export function resolveVideoLoad(
  response: ApiResponse<VideoData[]>,
  previous: VideoLoadState,
  online = true,
): VideoLoadState {
  if (response.error || response.data.length === 0 || (response.metadata?.warnings?.length && previous.videos.length > 0)) {
    if (previous.videos.length > 0) {
      return {
        ...previous,
        error: null,
        warning: 'Actualisation impossible. La dernière bibliothèque chargée reste disponible.',
      };
    }
    return {
      ...emptyVideoLoadState,
      error: !online
        ? 'Vous êtes hors ligne. Aucune copie disponible. Vérifiez votre connexion, puis réessayez.'
        : 'Impossible de charger les vidéos. Aucune copie disponible. Veuillez réessayer.',
    };
  }

  return {
    videos: buildVideoLibrary(assignCategories(response.data)),
    error: null,
    warning: response.metadata?.warnings?.length
      ? 'La connexion à Google Sheets n’a pas abouti. La copie locale reste disponible.'
      : null,
    source: response.metadata?.source ?? 'local',
    loadedAt: response.metadata?.timestamp ?? Date.now(),
    publishedAt: response.metadata?.publishedAt,
  };
}
