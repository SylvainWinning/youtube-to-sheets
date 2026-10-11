import type { SearchFilters } from '../types/search';
import type { SortOptions } from '../types/sort';
import { SHEET_TABS } from './constants.ts';

export interface FilterState {
  selectedTab: number;
  sortOptions: SortOptions | null;
  searchFilters: SearchFilters;
  selectedCategory: string | null;
  selectedPlaylistId: string | null;
}
export function readFilterState(search: string): FilterState {
  const params = new URLSearchParams(search);
  const duration = params.get('duration');
  const index = duration !== null && /^\d+$/.test(duration) ? Number(duration) : -1;
  const sort = params.get('sort');
  return {
    selectedTab: index >= 0 && index < SHEET_TABS.length ? index : -1,
    sortOptions: sort === 'newest' || sort === 'oldest'
      ? { field: 'publishedAt', direction: sort === 'newest' ? 'desc' : 'asc' } : null,
    searchFilters: { query: params.get('q') ?? '', fields: ['title', 'channel', 'category'] },
    selectedCategory: params.get('category') || null,
    selectedPlaylistId: params.get('playlist') || null,
  };
}
export function writeFilterURL(source: URL, state: FilterState): URL {
  const url = new URL(source.href);
  const values: Record<string, string | null> = {
    q: state.searchFilters.query || null,
    category: state.selectedCategory,
    playlist: state.selectedPlaylistId,
    duration: state.selectedTab === -1 ? null : String(state.selectedTab),
    sort: state.sortOptions ? (state.sortOptions.direction === 'desc' ? 'newest' : 'oldest') : null,
  };
  for (const [key, value] of Object.entries(values)) {
    if (value === null) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  return url;
}
