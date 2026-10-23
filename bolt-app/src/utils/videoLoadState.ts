import type { LibraryVideo, VideoData } from '../types/video.ts';
import type { ApiResponse, SyncMetadata } from './api/sheets/types.ts';
import { assignCategories } from './assignCategories.ts';
import { buildVideoLibrary } from './videoLibrary.ts';
import { getVideoCollections, getVideoTopics } from './videoFacets.ts';

export interface VideoLoadState {
  videos: LibraryVideo[];
  error: string | null;
  warning: string | null;
  source: 'local' | 'sheets' | null;
  loadedAt: number | null;
  publishedAt?: number;
  sync?: SyncMetadata;
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

  const normalized = response.data.map(video => ({
    ...video, topics: getVideoTopics(video), collections: getVideoCollections(video),
  }));
  const videos = buildVideoLibrary(assignCategories(normalized));
  // A revalidated snapshot can be unchanged. Keep the array identity so the
  // grid retains its loaded batches, focus and reading position.
  const unchanged = JSON.stringify(videos) === JSON.stringify(previous.videos);
  return {
    videos: unchanged ? previous.videos : videos,
    error: null,
    warning: response.metadata?.warnings?.length
      ? 'Certaines données n’ont pas pu être actualisées. La copie disponible est affichée.'
      : null,
    source: response.metadata?.source ?? 'local',
    loadedAt: response.metadata?.timestamp ?? Date.now(),
    publishedAt: response.metadata?.publishedAt,
    sync: response.metadata?.sync,
  };
}
