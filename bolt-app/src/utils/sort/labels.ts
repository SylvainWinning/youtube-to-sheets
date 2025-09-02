// This file exports a mapping of sort option keys to their French labels.
// The keys correspond to the string values returned by `getOptionValue` in utils.ts.
// Note: we no longer import `SortOptions` here because the type isn't used directly.

// Mapping of internal sort option keys to their French labels.
// Note: the key '' corresponds to a null sort option. Previously this
// displayed "Sans tri", but since the UI no longer exposes an unsorted
// state, we now map it to "Plus récentes" so that the newest videos
// appear by default.
export const SORT_LABELS: Record<string, string> = {
  '': 'Plus récentes',
  'publishedAt_desc': 'Plus récentes',
  'publishedAt_asc': 'Plus anciennes',
};
