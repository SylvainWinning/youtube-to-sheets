import { getCategoryLabel } from './utils/categoryLabels';
import React from 'react';
import { RefreshCw } from 'lucide-react';
import { VideoChooser } from './components/VideoChooser';
import { VideoGrid } from './components/VideoGrid';
import { DurationTabs } from './components/DurationTabs';
import { SearchBar } from './components/SearchBar';
import { SortSelect } from './components/SortSelect';
import { CategorySelect } from './components/CategorySelect';
import { PlaylistSelect, getPlaylistLabel } from './components/PlaylistSelect';
import { ActiveFilters, type ActiveFilter } from './components/ActiveFilters';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { SoundToggle } from './components/ui/SoundToggle';
import { ThemeToggle } from './components/ui/ThemeToggle';
import { MobileFilterBar } from './components/MobileFilterBar';
import { ReturnToTop } from './components/ReturnToTop';
import { filterByDurationSelection, getDurationLabel } from './utils/durationSelection';
import { filterVideoFacets } from './utils/videoFacets';
import { filterVideosBySearch, rankVideosBySearch } from './utils/searchUtils';
import { sortVideos } from './utils/sortUtils';
import { useVideos } from './hooks/useVideos';
import { useSound } from './hooks/useSound';
import { useLibraryFilters } from './hooks/useLibraryFilters';
import { clearLibraryProgress } from './utils/libraryProgress';
import { filterVideosByPlaylist } from './utils/videoLibrary';

export default function App() {
  const library = useVideos();
  const { videos, isLoading, error: videosError, loadVideos } = library;
  const hasLibrary = videos.length > 0;
  const { playClick } = useSound();
  const { selectedTab, setSelectedTab, sortOptions, setSortOptions,
    searchFilters, setSearchFilters, selectedCategory, setSelectedCategory,
    selectedCollection, setSelectedCollection,
    selectedPlaylistId, setSelectedPlaylistId } = useLibraryFilters();

  const scrollToTop = React.useCallback(
    () => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }),
    [],
  );

  // Charge toujours les vidéos, même sans configuration Sheets
  React.useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // Permet de remonter en haut quand on tape la barre d'état iOS (Cordova/Ionic)
  React.useEffect(() => {
    const handleStatusTap = () => {
      scrollToTop();
    };

    window.addEventListener('statusTap', handleStatusTap);
    return () => {
      window.removeEventListener('statusTap', handleStatusTap);
    };
  }, [scrollToTop]);

  const filteredBySearch = React.useMemo(
    () => filterVideosBySearch(videos, searchFilters),
    [videos, searchFilters],
  );

  const filteredByCategory = React.useMemo(
    () => filterVideoFacets(filteredBySearch, selectedCategory, selectedCollection),
    [filteredBySearch, selectedCategory, selectedCollection],
  );

  const filteredByPlaylist = React.useMemo(
    () => filterVideosByPlaylist(filteredByCategory, selectedPlaylistId),
    [filteredByCategory, selectedPlaylistId],
  );

  const filteredByDuration = React.useMemo(
    () => filterByDurationSelection(filteredByPlaylist, selectedTab),
    [filteredByPlaylist, selectedTab],
  );

  const sortedVideos = React.useMemo(() => {
    const ordered = sortVideos(filteredByDuration, sortOptions, selectedPlaylistId);
    return sortOptions ? ordered : rankVideosBySearch(ordered, searchFilters);
  }, [filteredByDuration, sortOptions, selectedPlaylistId, searchFilters]);

  const home = React.useRef<HTMLButtonElement>(null);
  const returnToTop = React.useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    home.current?.focus({ preventScroll: true });
  }, []);
  const controlsStart = React.useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = React.useState(false);
  React.useEffect(() => {
    const marker = controlsStart.current;
    if (!marker) return;
    const observer = new IntersectionObserver(([entry]) => setStuck(entry.boundingClientRect.top < 0));
    observer.observe(marker);
    return () => observer.disconnect();
  }, [hasLibrary, videosError]);
  const filterKey = JSON.stringify([searchFilters.query, selectedCategory, selectedCollection,
    selectedPlaylistId, selectedTab, sortOptions]);
  const previousFilterKey = React.useRef(filterKey);
  React.useLayoutEffect(() => {
    if (previousFilterKey.current === filterKey) return;
    previousFilterKey.current = filterKey;
    const start = controlsStart.current;
    if (!start) return;
    const top = start.getBoundingClientRect().top + window.scrollY;
    if (window.scrollY > top) window.scrollTo({ top, behavior: 'instant' });
  }, [filterKey]);

  const appError = videosError;
  const clearFilters = () => {
    clearLibraryProgress();
    setSearchFilters(filters => ({ ...filters, query: '' }));
    setSelectedTab(-1);
    setSelectedCategory(null);
    setSelectedPlaylistId(null);
    setSelectedCollection(null);
  };
  const activeFilters: ActiveFilter[] = [];
  if (searchFilters.query.trim()) activeFilters.push({
    id: 'search', label: `Recherche : ${searchFilters.query.trim()}`,
    onRemove: () => setSearchFilters(filters => ({ ...filters, query: '' })),
  });
  if (selectedCategory) activeFilters.push({
    id: 'category', label: `Thème : ${getCategoryLabel(selectedCategory)}`, onRemove: () => setSelectedCategory(null),
  });
  if (selectedPlaylistId) activeFilters.push({
    id: 'playlist', label: `Playlist : ${getPlaylistLabel(selectedPlaylistId)}`, onRemove: () => setSelectedPlaylistId(null),
  });
  if (selectedTab !== -1) activeFilters.push({
    id: 'duration', label: `Durée : ${getDurationLabel(selectedTab)}`, onRemove: () => setSelectedTab(-1),
  });
  if (selectedCollection) activeFilters.push({
    id: 'collection', label: `Collection : ${getCategoryLabel(selectedCollection)}`,
    onRemove: () => setSelectedCollection(null),
  });

  // Clip overflow without creating a scroll container that would trap the sticky header.
  return (
    <div className="min-h-screen bg-youtube-bg-light dark:bg-neutral-900 overflow-x-clip pt-2">
      <header className="library-header bg-white dark:bg-neutral-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="library-header-content">
            <div className="library-header-main flex items-center justify-between gap-2">
              <button
                ref={home}
                onClick={() => { playClick(); window.scrollTo({ top: 0, behavior: 'instant' }); }}
                type="button"
                aria-label="Revenir en haut de la page"
                className="flex items-center gap-2 sm:gap-3 min-w-0 group"
              >
                <img
                  src={import.meta.env.BASE_URL + 'youtube-logo.svg'}
                  alt="YouTube logo"
                  className="h-6 w-6 sm:h-8 sm:w-8 shrink-0"
                />
                <h1 className="text-base sm:text-xl font-semibold text-youtube-black dark:text-white min-w-0 flex items-center gap-2">
                  <span className="text-left leading-tight">Mes vidéos YouTube</span>
                </h1>
              </button>
              <div className="flex shrink-0 items-center gap-2">
                <ThemeToggle />
                <SoundToggle />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button type="button" disabled={isLoading} aria-busy={isLoading}
                onClick={() => { playClick(); void loadVideos(); }}
                className="neu-button flex shrink-0 min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm text-gray-700 dark:text-gray-100 disabled:opacity-60">
                <RefreshCw aria-hidden="true" className={`h-4 w-4 ${isLoading ? 'animate-spin motion-reduce:animate-none' : ''}`} />
                {isLoading && hasLibrary ? 'Actualisation…' : 'Actualiser'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-0 pb-4">
        <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {isLoading && hasLibrary ? 'Actualisation en cours. Les vidéos restent disponibles.'
            : !isLoading && library.loadedAt !== null && !library.warning ? 'Bibliothèque chargée.' : ''}
        </p>
        {library.warning && (
          <p role="status" className="mb-3 text-sm text-amber-800 dark:text-amber-200">{library.warning}</p>
        )}
        {(!isLoading || hasLibrary) && !appError && (
          <>
            <div ref={controlsStart} aria-hidden="true" className="h-px" />
            <div className="library-controls sticky top-0 z-40 bg-youtube-bg-light dark:bg-neutral-900">
              <SearchBar
                filters={searchFilters}
                onFiltersChange={setSearchFilters}
              />
              <MobileFilterBar
                stuck={stuck}
                searching={Boolean(searchFilters.query.trim())}
                onReturnTop={returnToTop}
                videos={videos}
                durationVideos={filteredByPlaylist}
                selectedTab={selectedTab}
                onTabChange={setSelectedTab}
                sortOptions={sortOptions}
                onSortOptionsChange={setSortOptions}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                selectedCollection={selectedCollection}
                onCollectionChange={setSelectedCollection}
                selectedPlaylistId={selectedPlaylistId}
                onPlaylistChange={setSelectedPlaylistId}
              />
              <div className="library-filters-expanded min-w-0 flex-1 grid-cols-4 items-stretch gap-2">
                <div className="w-full h-full">
                  <SortSelect options={sortOptions} onOptionsChange={setSortOptions} searching={Boolean(searchFilters.query.trim())} />
                </div>
                <CategorySelect
                  videos={videos}
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  className="w-full h-full"
                />
                <CategorySelect videos={videos} facet="collection" selectedCategory={selectedCollection}
                  onCategoryChange={setSelectedCollection} className="w-full h-full" />
                <PlaylistSelect
                  videos={videos}
                  selectedPlaylistId={selectedPlaylistId}
                  onPlaylistChange={setSelectedPlaylistId}
                  className="w-full h-full"
                />
              </div>
              {stuck && <div className="library-durations-expanded absolute right-0 top-1"><ReturnToTop onReturn={returnToTop} /></div>}
            </div>
            <div className="library-durations-expanded">
              <DurationTabs
                selectedTab={selectedTab}
                onTabChange={setSelectedTab}
                videos={filteredByPlaylist}
              />
            </div>
            <ActiveFilters resultCount={sortedVideos.length} filters={activeFilters} onClear={clearFilters} action={<VideoChooser videos={sortedVideos} />} />
          </>
        )}
        {isLoading && !hasLibrary && <LoadingState />}
        {appError && <ErrorState message={appError} onRetry={loadVideos} />}
        {(!isLoading || hasLibrary) && !appError && (sortedVideos.length > 0 ? <VideoGrid videos={sortedVideos} /> : (
          <div className="py-8 text-center text-youtube-black dark:text-white">
            <p>Aucune vidéo ne correspond à votre recherche ou aux filtres sélectionnés.</p>
          </div>
        ))}
      </main>

    </div>
  );
}
