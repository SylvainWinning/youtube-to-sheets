import { useCallback, useEffect, useState, type SetStateAction } from 'react';
import { readFilterState, writeFilterURL, type FilterState } from '../utils/filterState';

export function useLibraryFilters() {
  const [state, setState] = useState(() => readFilterState(window.location.search));
  useEffect(() => {
    const url = writeFilterURL(new URL(window.location.href), state);
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url);
  }, [state]);
  useEffect(() => {
    const restore = () => setState(readFilterState(window.location.search));
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  const update = useCallback(<K extends keyof FilterState>(key: K, value: SetStateAction<FilterState[K]>) => {
    setState(previous => ({ ...previous, [key]: typeof value === 'function'
      ? (value as (previous: FilterState[K]) => FilterState[K])(previous[key]) : value }));
  }, []);
  const setSelectedTab = useCallback((value: SetStateAction<FilterState['selectedTab']>) => update('selectedTab', value), [update]);
  const setSortOptions = useCallback((value: SetStateAction<FilterState['sortOptions']>) => update('sortOptions', value), [update]);
  const setSearchFilters = useCallback((value: SetStateAction<FilterState['searchFilters']>) => update('searchFilters', value), [update]);
  const setSelectedCategory = useCallback((value: SetStateAction<FilterState['selectedCategory']>) => update('selectedCategory', value), [update]);
  const setSelectedPlaylistId = useCallback((value: SetStateAction<FilterState['selectedPlaylistId']>) => update('selectedPlaylistId', value), [update]);
  return { ...state, setSelectedTab, setSortOptions, setSearchFilters, setSelectedCategory, setSelectedPlaylistId };
}
