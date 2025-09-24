import type { VideoData } from '../types/video.ts';
import type { SortOptions } from '../types/sort.ts';
import { parseDate } from './timeUtils.ts';

function getPlaylistOrder(value: VideoData['playlistPosition']): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : Number.POSITIVE_INFINITY;
}

function sortByPlaylistPosition(videos: VideoData[]): VideoData[] {
  return videos
    .map((video, index) => ({ video, index }))
    .sort((a, b) => {
      const orderA = getPlaylistOrder(a.video.playlistPosition);
      const orderB = getPlaylistOrder(b.video.playlistPosition);

      if (orderA === orderB) {
        return a.index - b.index;
      }

      return orderA - orderB;
    })
    .map(item => item.video);
}

export function sortVideos(videos: VideoData[], options: SortOptions | null): VideoData[] {
  if (!options) {
    return sortByPlaylistPosition(videos);
  }

  console.log('Sorting videos:', {
    totalVideos: videos.length,
    sortOptions: options
  });

  return [...videos].sort((a, b) => {
    const field = options.field;
    const rawA = a[field];
    const rawB = b[field];

    // Place les entrées sans date en fin de liste
    if (!rawA || !rawB) {
      console.warn('Missing date found during sort:', {
        videoA: { title: a.title, date: rawA },
        videoB: { title: b.title, date: rawB }
      });
      if (!rawA && !rawB) return 0;
      if (!rawA) return 1;
      if (!rawB) return -1;
      return 0;
    }

    // Parse les dates en utilisant la fonction parseDate qui gère tous les formats
    const dateA = parseDate(rawA);
    const dateB = parseDate(rawB);

    // Si une des dates est invalide, log l'erreur et place la vidéo à la fin
    if (!dateA || !dateB) {
      console.warn('Invalid date found during sort:', {
        videoA: { title: a.title, date: rawA },
        videoB: { title: b.title, date: rawB }
      });
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return 0;
    }

    const timeA = dateA.getTime();
    const timeB = dateB.getTime();

    return options.direction === 'desc'
      ? timeB - timeA  // Plus récentes en premier
      : timeA - timeB; // Plus anciennes en premier
  });
}
