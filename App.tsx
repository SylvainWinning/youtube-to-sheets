import React from 'react';
import { RefreshCw } from 'lucide-react';
import { VideoGrid } from './components/VideoGrid';
import { DurationTabs } from './components/DurationTabs';
import { SearchBar } from './components/SearchBar';
import { SortSelect } from './components/SortSelect';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { MissingConfig } from './components/MissingConfig';
import { SoundToggle } from './components/ui/SoundToggle';
import { ThemeToggle } from './components/ui/ThemeToggle';
import { SHEET_TABS, getConfig } from './utils/constants';
import { filterVideosByDuration } from './utils/videoFilters';
import { filterVideosBySearch } from './utils/searchUtils';
import { sortVideos } from './utils/sortUtils';
import { useVideos } from './hooks/useVideos';
import { useSound } from './hooks/useSound';
import { SearchFilters } from './types/search';
import { SortOptions } from './types/sort';

/**
 * Root application component. This component orchestrates the top‑level
 * controls (sorting, filtering, theme toggles) and renders the grid of
 * videos. In addition to the existing behaviour (resetting filters,
 * handling configuration errors and status bar taps), this version
 * introduces a custom touch handler on iOS to mirror the native
 * behaviour where tapping the top left corner of the screen scrolls
 * back to the top of the page. The statusTap event provided by
 * Cordova/Ionic only fires when running inside those environments;
 * therefore, we also listen for touchstart on iOS devices and, when
 * the user taps within a small region at the top of the viewport,
 * programmatically scroll back to the top. See the Ionic forum for
 * additional context on why users expect this behaviour【729783637461514†L56-L59】.
 */
export default function App() {
  const { error: configError } = getConfig();
  const { videos, isLoading, error: videosError, loadVideos } = useVideos(configError);
  const { playClick } = useSound();
  const [selectedTab, setSelectedTab] = React.useState(-1);
  const [sortOptions, setSortOptions] = React.useState<SortOptions>({
    field: 'publishedAt',
    direction: 'desc',
  });
  const [searchFilters, setSearchFilters] = React.useState<SearchFilters>({
    query: '',
    fields: ['title', 'channel', 'category'],
  });

  const scrollToTop = React.useCallback(
    () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    [],
  );

  const resetFilters = React.useCallback(async () => {
    playClick();
    // Remonte en haut de la page pour retrouver l'entête
    scrollToTop();
    setSelectedTab(-1);
    setSearchFilters({
      query: '',
      fields: ['title', 'channel', 'category'],
    });
    await loadVideos();
  }, [loadVideos, playClick, scrollToTop]);

  // Charge toujours les vidéos, même sans configuration Sheets
  React.useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // Permet de remonter en haut lorsque l'utilisateur tape la barre d'état
  // iOS ou touche le coin supérieur gauche de l'écran.
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

  const filteredByDuration = React.useMemo(
    () =>
      selectedTab === -1
        ? filteredBySearch
        : filterVideosByDuration(filteredBySearch, SHEET_TABS[selectedTab]),
    [filteredBySearch, selectedTab],
  );

  const sortedVideos = React.useMemo(
    () => sortVideos(filteredByDuration, sortOptions),
    [filteredByDuration, sortOptions],
  );

  const appError = videosError;

  return (
    <div className="min-h-screen bg-youtube-bg-light dark:bg-neutral-900 overflow-x-hidden pt-4">
      <header className="bg-white dark:bg-neutral-800 shadow-sm sticky top-0 z-50 mb-12">
        {/* Réduction de la hauteur d’en-tête */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-1">
          {/* Réduction de l’espacement vertical */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <button onClick={resetFilters} className="flex items-center gap-3 group" disabled={isLoading}>
                <img
                  src={import.meta.env.BASE_URL + 'youtube-logo.svg'}
                  alt="YouTube logo"
                  className="h-8 w-8"
                />
                <h1 className="text-xl font-semibold text-youtube-black dark:text-white flex items-center gap-2">
                  Mes Vidéos YouTube
                  {/* Icône de synchronisation placée juste à droite du texte et visible en mode sombre */}
                  <RefreshCw
                    className={
                      'h-5 w-5 text-youtube-gray-light dark:text-youtube-gray-dark transition-all ' +
                      (isLoading ? 'animate-spin' : 'group-hover:text-youtube-red')
                    }
                  />
                </h1>
              </button>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <SoundToggle />
              </div>
            </div>
            {!isLoading && !appError && (
              <div className="flex items-center justify-between gap-4">
                <div className="w-full max-w-[280px]">
                  <SortSelect options={sortOptions} onOptionsChange={setSortOptions} />
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-0">
        {configError && <MissingConfig message={configError} />}
        {!isLoading && !appError && (
          <>
            <SearchBar filters={searchFilters} onFiltersChange={setSearchFilters} />
            <DurationTabs selectedTab={selectedTab} onTabChange={setSelectedTab} videos={filteredBySearch} />
          </>
        )}
        {isLoading && <LoadingState />}
        {appError && <ErrorState message={appError} />}
        {!isLoading && !appError && <VideoGrid videos={sortedVideos} />}
      </main>
    </div>
  );
}
