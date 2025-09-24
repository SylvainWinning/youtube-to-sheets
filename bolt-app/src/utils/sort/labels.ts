// This file exports a mapping of sort option keys to their French labels.
// The keys correspond to the string values returned by `getOptionValue` in utils.ts.
// Note: we no longer import `SortOptions` here because the type isn't used directly.

// Mapping of internal sort option keys to their French labels.
export const SORT_LABELS: Record<string, string> = {
  '': 'Ordre YouTube',
  'publishedAt_desc': 'Plus récentes',
  'publishedAt_asc': 'Plus anciennes',
};
