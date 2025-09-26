import type { VideoData } from '../types/video.ts';
import type { SortOptions } from '../types/sort.ts';
import { parseDate } from './timeUtils.ts';

function parsePlaylistPosition(value: VideoData['playlistPosition']): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getComparablePlaylistPosition(video: VideoData): number {
  const parsed = parsePlaylistPosition(video.playlistPosition);
  if (parsed !== null) {
    return parsed;
  }
  return Number.POSITIVE_INFINITY;
}

export function sortVideos(videos: VideoData[], options: SortOptions | null): VideoData[] {
  if (!options) {
    return videos
      .map((video, index) => ({ video, index }))
      .sort((a, b) => {
        const positionA = getComparablePlaylistPosition(a.video);
        const positionB = getComparablePlaylistPosition(b.video);

        if (positionA === positionB) {
          return a.index - b.index;
        }

        return positionA - positionB;
      })
      .map(item => item.video);
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
