import type { VideoData } from '../types/video.ts';
import type { SearchFilters } from '../types/search.ts';

export function filterVideosBySearch(videos: VideoData[], filters: SearchFilters): VideoData[] {
  if (!filters.query.trim() || filters.fields.length === 0) {
    return videos;
  }

  const searchTerm = filters.query.toLowerCase().trim();
  
  return videos.filter(video => {
    return filters.fields.some(field => {
      const key = field === 'category' ? 'myCategory' : field;
      const value = (video[key as keyof VideoData] ?? '').toLowerCase();
      return value.includes(searchTerm);
    });
  });
}
