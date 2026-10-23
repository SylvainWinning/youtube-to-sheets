import type { SearchFilters } from '../types/search';
import type { SortOptions } from '../types/sort';
import { SHEET_TABS } from './constants.ts';
import { isDurationLimit } from './durationSelection.ts';
import { isCollection } from './videoFacets.ts';

export interface FilterState {
  selectedTab: number;
  sortOptions: SortOptions | null;
  searchFilters: SearchFilters;
  selectedCategory: string | null;
  selectedCollection: string | null;
  selectedPlaylistId: string | null;
}
export function readFilterState(search: string): FilterState {
  const params = new URLSearchParams(search);
  const duration = params.get('duration');
  const index = duration !== null && /^\d+$/.test(duration) ? Number(duration) : -1;
  const sort = params.get('sort');
  const maxDuration = Number(params.get('maxDuration'));
  const category = params.get('category') || null;
  const legacyCollection = category && isCollection(category) ? category : null;
  return {
    selectedTab: isDurationLimit(maxDuration) ? -maxDuration
      : index >= 0 && index < SHEET_TABS.length ? index : -1,
    sortOptions: sort === 'newest' || sort === 'oldest'
      ? { field: 'publishedAt', direction: sort === 'newest' ? 'desc' : 'asc' } : null,
    searchFilters: { query: params.get('q') ?? '', fields: ['title', 'channel', 'category'] },
    selectedCategory: legacyCollection ? null : category,
    selectedCollection: params.get('collection') || legacyCollection,
    selectedPlaylistId: params.get('playlist') || null,
  };
}
export function writeFilterURL(source: URL, state: FilterState): URL {
  const url = new URL(source.href);
  const values: Record<string, string | null> = {
    q: state.searchFilters.query || null,
    category: state.selectedCategory,
    collection: state.selectedCollection,
    playlist: state.selectedPlaylistId,
    duration: state.selectedTab >= 0 ? String(state.selectedTab) : null,
    maxDuration: state.selectedTab < -1 && isDurationLimit(-state.selectedTab) ? String(-state.selectedTab) : null,
    sort: state.sortOptions ? (state.sortOptions.direction === 'desc' ? 'newest' : 'oldest') : null,
  };
  for (const [key, value] of Object.entries(values)) {
    if (value === null) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  return url;
}
