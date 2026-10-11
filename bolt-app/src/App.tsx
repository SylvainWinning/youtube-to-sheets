import React from 'react';
import { RefreshCw } from 'lucide-react';
import { VideoGrid } from './components/VideoGrid';
import { DurationTabs } from './components/DurationTabs';
import { SearchBar } from './components/SearchBar';
import { SortSelect } from './components/SortSelect';
import { CategorySelect } from './components/CategorySelect';
import { PlaylistSelect, getPlaylistLabel } from './components/PlaylistSelect';
import { ActiveFilters, type ActiveFilter } from './components/ActiveFilters';
import { getSelectedLabel } from './utils/sort/utils';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { LibraryNotice } from './components/LibraryNotice';
import { SoundToggle } from './components/ui/SoundToggle';
import { ThemeToggle } from './components/ui/ThemeToggle';
import { MobileFilterBar } from './components/MobileFilterBar';
import { SHEET_TABS } from './utils/constants';
import { filterVideosByDuration } from './utils/videoFilters';
import { filterVideosBySearch } from './utils/searchUtils';
import { sortVideos } from './utils/sortUtils';
import { useVideos } from './hooks/useVideos';
import { useSound } from './hooks/useSound';
import { useLibraryFilters } from './hooks/useLibraryFilters';
import { clearLibraryProgress } from './utils/libraryProgress';
import { filterVideosByPlaylist } from './utils/videoLibrary';

/**
 * Main React component for the Bolt‑app. This version adds a custom
 * touch handler for iOS that emulates the native behaviour of
 * scrolling back to the top of the page when the user taps the top
 * left corner of the screen. This supplements the Cordova/Ionic
 * `statusTap` event which is only available in certain contexts.
 */
export default function App() {
  const library = useVideos();
  const { videos, isLoading, error: videosError, loadVideos } = library;
  const hasLibrary = videos.length > 0;
  const { playClick } = useSound();
  const { selectedTab, setSelectedTab, sortOptions, setSortOptions,
    searchFilters, setSearchFilters, selectedCategory, setSelectedCategory,
    selectedPlaylistId, setSelectedPlaylistId } = useLibraryFilters();

  const scrollToTop = React.useCallback(
    () => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }),
    [],
  );

  const resetFilters = React.useCallback(async () => {
    clearLibraryProgress();
    playClick();
    // Assure un retour en haut de l'écran sur iOS
    scrollToTop();
    setSelectedTab(-1);
    setSearchFilters({
      query: '',
      fields: ['title', 'channel', 'category'],
    });
    setSortOptions(null);
    setSelectedCategory(null);
    setSelectedPlaylistId(null);
    await loadVideos();
  }, [loadVideos, playClick, scrollToTop]);

  // Charge toujours les vidéos, même sans configuration Sheets
  React.useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // Permet de remonter en haut quand on tape la barre d'état iOS (Cordova/Ionic)
  // ou lorsqu'on touche le coin supérieur gauche sur un appareil iOS.
  React.useEffect(() => {
    const handleStatusTap = () => {
      scrollToTop();
    };

    const handleTouchEnd = (event: TouchEvent) => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (!isIOS || event.changedTouches.length === 0) return;
      const touch = event.changedTouches[0];
      if (touch.clientY < 50 && touch.clientX < 100) {
        scrollToTop();
      }
    };

    window.addEventListener('statusTap', handleStatusTap);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('statusTap', handleStatusTap);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [scrollToTop]);

  const filteredBySearch = React.useMemo(
    () => filterVideosBySearch(videos, searchFilters),
    [videos, searchFilters],
  );

  const filteredByCategory = React.useMemo(
    () =>
      selectedCategory
        ? filteredBySearch.filter(v => v.myCategory === selectedCategory)
        : filteredBySearch,
    [filteredBySearch, selectedCategory],
  );

  const filteredByPlaylist = React.useMemo(
    () => filterVideosByPlaylist(filteredByCategory, selectedPlaylistId),
    [filteredByCategory, selectedPlaylistId],
  );

  const filteredByDuration = React.useMemo(
    () =>
      selectedTab === -1
        ? filteredByPlaylist
        : filterVideosByDuration(filteredByPlaylist, SHEET_TABS[selectedTab]),
    [filteredByPlaylist, selectedTab],
  );

  const sortedVideos = React.useMemo(
    () => sortVideos(filteredByDuration, sortOptions, selectedPlaylistId),
    [filteredByDuration, sortOptions, selectedPlaylistId],
  );

  const appError = videosError;
  const clearFilters = () => {
    clearLibraryProgress();
    setSearchFilters(filters => ({ ...filters, query: '' }));
    setSelectedTab(-1);
    setSelectedCategory(null);
    setSelectedPlaylistId(null);
    setSortOptions(null);
  };
  const activeFilters: ActiveFilter[] = [];
  if (searchFilters.query.trim()) activeFilters.push({
    id: 'search', label: `Recherche : ${searchFilters.query.trim()}`,
    onRemove: () => setSearchFilters(filters => ({ ...filters, query: '' })),
  });
  if (selectedCategory) activeFilters.push({
    id: 'category', label: `Catégorie : ${selectedCategory}`, onRemove: () => setSelectedCategory(null),
  });
  if (selectedPlaylistId) activeFilters.push({
    id: 'playlist', label: `Playlist : ${getPlaylistLabel(selectedPlaylistId)}`, onRemove: () => setSelectedPlaylistId(null),
  });
  if (selectedTab !== -1) activeFilters.push({
    id: 'duration', label: `Durée : ${SHEET_TABS[selectedTab].name}`, onRemove: () => setSelectedTab(-1),
  });
  if (sortOptions) activeFilters.push({
    id: 'sort', label: `Tri : ${getSelectedLabel(sortOptions)}`, onRemove: () => setSortOptions(null),
  });

  return (
    <div className="min-h-screen bg-youtube-bg-light dark:bg-neutral-900 overflow-x-hidden pt-2">
      <header className="bg-white dark:bg-neutral-800 shadow-xs sticky top-0 z-50 mb-4 sm:mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={resetFilters}
                className="flex items-center gap-2 sm:gap-3 min-w-0 group"
                disabled={isLoading}
              >
                <img
                  src={import.meta.env.BASE_URL + 'youtube-logo.svg'}
                  alt="YouTube logo"
                  className="h-6 w-6 sm:h-8 sm:w-8 shrink-0"
                />
                <h1 className="text-base sm:text-xl font-semibold text-youtube-black dark:text-white min-w-0 flex items-center gap-2">
                  <span className="truncate">Mes Vidéos YouTube</span>
                  <RefreshCw
                    className={
                      'hidden sm:block h-5 w-5 text-youtube-gray-light dark:text-youtube-gray-dark transition-all ' +
                      (isLoading ? 'animate-spin' : 'group-hover:text-youtube-red-accessible dark:group-hover:text-youtube-red-accessible-dark')
                    }
                  />
                </h1>
              </button>
              <div className="flex shrink-0 items-center gap-2">
                <ThemeToggle />
                <SoundToggle />
              </div>
            </div>
            {(!isLoading || hasLibrary) && !appError && (
              <div className="hidden w-full sm:flex items-center justify-between gap-4">
                <div className="w-full max-w-[280px]">
                  <SortSelect options={sortOptions} onOptionsChange={setSortOptions} />
                </div>
                <CategorySelect
                  videos={videos}
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  className="w-full max-w-[280px]"
                />
                <PlaylistSelect
                  videos={videos}
                  selectedPlaylistId={selectedPlaylistId}
                  onPlaylistChange={setSelectedPlaylistId}
                  className="w-full max-w-[280px]"
                />
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-0 pb-4">
        <LibraryNotice state={library} isLoading={isLoading} onRetry={loadVideos} />
        {(!isLoading || hasLibrary) && !appError && (
          <>
            <SearchBar
              filters={searchFilters}
              onFiltersChange={setSearchFilters}
            />
            <MobileFilterBar
              videos={videos}
              durationVideos={filteredByPlaylist}
              selectedTab={selectedTab}
              onTabChange={setSelectedTab}
              sortOptions={sortOptions}
              onSortOptionsChange={setSortOptions}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              selectedPlaylistId={selectedPlaylistId}
              onPlaylistChange={setSelectedPlaylistId}
            />
            <div className="hidden sm:block">
              <DurationTabs
                selectedTab={selectedTab}
                onTabChange={setSelectedTab}
                videos={filteredByPlaylist}
              />
            </div>
            <ActiveFilters resultCount={sortedVideos.length} filters={activeFilters} onClear={clearFilters} />
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
