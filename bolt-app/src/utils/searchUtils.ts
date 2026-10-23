import { getCategoryLabel } from './categoryLabels.ts';
import { getVideoCollections, getVideoTopics } from './videoFacets.ts';
import type { VideoData } from '../types/video.ts';
import type { SearchFilters } from '../types/search.ts';

function normalizeSearchText(value: string): string {
  return value.normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/\b([a-z])\.(?=[a-z](?:\.|\b))/g, '$1')
    .replace(/[’‘ʼʻ＇'`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const shortAcronyms = new Set(['ia', 'ai', 'ui', 'ux', 'vr', 'ar']);

function createSearchMatcher(filters: SearchFilters) {
  const query = normalizeSearchText(filters.query);
  const terms = query.split(/\s+/).filter(Boolean);
  return (video: VideoData): number | null => {
    if (!terms.length) return null;
    const fields = filters.fields.map(field => {
      const raw = field === 'category'
        ? [video.myCategory ?? '', ...getVideoTopics(video), ...getVideoCollections(video)]
          .map(value => `${value} ${getCategoryLabel(value)}`).join(' ')
        : video[field] ?? '';
      const text = normalizeSearchText(raw);
      // Keep l'entreprise/lentreprise equivalent and recognize IA in l'IA.
      const words = new Set([...text.split(' '), ...normalizeSearchText(raw.replace(/[’‘ʼʻ＇'`]/g, ' ')).split(' ')]);
      return { text, words };
    });
    let score = 0;
    for (const term of terms) {
      let best = 0;
      for (const { text, words } of fields) {
        if (words.has(term)) best = Math.max(best, 4);
        else if (!shortAcronyms.has(term) && [...words].some(word => word.startsWith(term))) best = Math.max(best, 2);
        else if (term.length > 2 && text.includes(term)) best = Math.max(best, 1);
      }
      if (!best) return null;
      score += best;
    }
    return score + (fields.some(field => field.text === query) ? 8 : 0);
  };
}

export function filterVideosBySearch(videos: VideoData[], filters: SearchFilters): VideoData[] {
  if (!filters.query.trim() || filters.fields.length === 0) return videos;
  const score = createSearchMatcher(filters);
  return videos.filter(video => score(video) !== null);
}

/** Relevance refines the default search order; explicit publication sorting wins. */
export function rankVideosBySearch(videos: VideoData[], filters: SearchFilters): VideoData[] {
  if (!filters.query.trim() || filters.fields.length === 0) return videos;
  const score = createSearchMatcher(filters);
  return videos.map((video, index) => ({ video, index, score: score(video) ?? 0 }))
    .sort((a, b) => b.score - a.score || a.index - b.index).map(item => item.video);
}
