import type { VideoData } from '../types/video.ts';
import type { SearchFilters } from '../types/search.ts';

function normalizeSearchText(value: string): string {
  return value.normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[’‘ʼʻ＇'`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function filterVideosBySearch(videos: VideoData[], filters: SearchFilters): VideoData[] {
  if (!filters.query.trim() || filters.fields.length === 0) {
    return videos;
  }

  const terms = normalizeSearchText(filters.query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  return videos.filter(video => {
    const values = filters.fields.map(field => {
      const key = field === 'category' ? 'myCategory' : field;
      return normalizeSearchText(video[key] ?? '');
    });
    // Each word is required, but may occur in a different selected field.
    return terms.every(term => values.some(value => value.includes(term)));
  });
}
