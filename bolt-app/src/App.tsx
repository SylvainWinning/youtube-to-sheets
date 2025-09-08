import React from 'react';
import { RefreshCw } from 'lucide-react';
import { VideoGrid } from './components/VideoGrid';
import { DurationTabs } from './components/DurationTabs';
import { SearchBar } from './components/SearchBar';
import { SortSelect } from './components/SortSelect';
import { CategorySelect } from './components/CategorySelect';
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
 * Main React component for the Bolt‑app. This version adds a custom
 * touch handler for iOS that emulates the native behaviour of
 * scrolling back to the top of the page when the user taps the top
 * left corner of the screen. This supplements the Cordova/Ionic
 * `statusTap` event which is only available in certain contexts【729783637461514†L56-L59】.
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
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);

  const resetFilters = React.useCallback(async () => {
    playClick();
    // Assure un retour en haut de l'écran sur iOS
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setSelectedTab(-1);
    setSearchFilters({
      query: '',
      fields: ['title', 'channel', 'category'],
    });
    setSelectedCategory(null);
    await loadVideos();
  }, [loadVideos, playClick]);

  // Charge toujours les vidéos, même sans configuration Sheets
  React.useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // Permet de remonter en haut quand on tape la barre d'état iOS (Cordova/Ionic)
  React.useEffect(() => {
    const handleStatusTap = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('statusTap', handleStatusTap);
    return () => window.removeEventListener('statusTap', handleStatusTap);
  }, []);

  // Gestionnaire tactile complémentaire pour iOS : détecte un tapotement
  // dans le coin supérieur gauche (50 px verticalement et 100 px
  // horizontalement) et déclenche un scroll vers le haut. Sans cela
  // l'événement statusTap n'est pas pris en charge dans les PWA
  // ou les navigateurs mobiles standards.
  React.useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!isIOS) return;
    const thresholdY = 50;
    const thresholdX = 100;
    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 0) return;
      const touch = event.touches[0];
      if (touch.clientY < thresholdY && touch.clientX < thresholdX) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('touchstart', handleTouchStart);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

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

  const filteredByDuration = React.useMemo(
    () =>
      selectedTab === -1
        ? filteredByCategory
        : filterVideosByDuration(filteredByCategory, SHEET_TABS[selectedTab]),
    [filteredByCategory, selectedTab],
  );

  const sortedVideos = React.useMemo(
    () => sortVideos(filteredByDuration, sortOptions),
    [filteredByDuration, sortOptions],
  );

  const appError = videosError;

  return (
    <div className="min-h-screen bg-youtube-bg-light dark:bg-neutral-900 overflow-x-hidden pt-4">
      <header className="bg-white dark:bg-neutral-800 shadow-sm sticky top-0 z-50 mb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <button
                onClick={resetFilters}
                className="flex items-center gap-3 group"
                disabled={isLoading}
              >
                <img
                  src={import.meta.env.BASE_URL + 'youtube-logo.svg'}
                  alt="YouTube logo"
                  className="h-8 w-8"
                />
                <h1 className="text-xl font-semibold text-youtube-black dark:text-white flex items-center gap-2">
                  Mes Vidéos YouTube
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
                <CategorySelect
                  videos={videos}
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  className="w-full max-w-[280px]"
                />
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-0">
        {configError && <MissingConfig message={configError} />}
        {!isLoading && !appError && (
          <>
            <SearchBar
              filters={searchFilters}
              onFiltersChange={setSearchFilters}
            />
            <DurationTabs
              selectedTab={selectedTab}
              onTabChange={setSelectedTab}
              videos={filteredByCategory}
            />
          </>
        )}
        {isLoading && <LoadingState />}
        {appError && <ErrorState message={appError} />}
        {!isLoading && !appError && <VideoGrid videos={sortedVideos} />}
      </main>
    </div>
  );
}
