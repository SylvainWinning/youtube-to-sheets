export type SortField = 'publishedAt';
export type SortDirection = 'asc' | 'desc';

export interface SortOptions {
  field: SortField;
  direction: SortDirection;
}

export const SORT_OPTIONS = {
  PUBLISHED_DESC: { field: 'publishedAt' as const, direction: 'desc' as const },
  PUBLISHED_ASC: { field: 'publishedAt' as const, direction: 'asc' as const }
} as const;
