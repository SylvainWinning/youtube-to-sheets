import { VideoData } from '../types/video';
import { SearchFilters } from '../types/search';

export function filterVideosBySearch(videos: VideoData[], filters: SearchFilters): VideoData[] {
  if (!filters.query.trim() || filters.fields.length === 0) {
    return videos;
  }

  const searchTerm = filters.query.toLowerCase().trim();
  
  return videos.filter(video => {
    return filters.fields.some(field => {
      const value = video[field].toLowerCase();
      return value.includes(searchTerm);
    });
  });
}