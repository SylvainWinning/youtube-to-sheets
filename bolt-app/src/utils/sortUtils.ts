import { VideoData } from '../types/video';
import { SortOptions } from '../types/sort';
import { parseDate } from './timeUtils';

export function sortVideos(videos: VideoData[], options: SortOptions | null): VideoData[] {
  if (!options) return videos;

  console.log('Sorting videos:', {
    totalVideos: videos.length,
    sortOptions: options
  });

  return [...videos].sort((a, b) => {
    // Parse les dates en utilisant la fonction parseDate qui gère tous les formats
    const dateA = parseDate(a[options.field]);
    const dateB = parseDate(b[options.field]);

    // Si une des dates est invalide, log l'erreur et place la vidéo à la fin
    if (!dateA || !dateB) {
      console.warn('Invalid date found during sort:', {
        videoA: { title: a.title, date: a[options.field] },
        videoB: { title: b.title, date: b[options.field] }
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
