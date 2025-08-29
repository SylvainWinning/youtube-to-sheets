import React from 'react';
import { RefreshCw } from 'lucide-react';
import { VideoGrid } from './components/VideoGrid';
import { DurationTabs } from './components/DurationTabs';
import { SearchBar } from './components/SearchBar';
import { SortSelect } from './components/SortSelect';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { SoundToggle } from './components/ui/SoundToggle';
import { ThemeToggle } from './components/ui/ThemeToggle';
import { SHEET_TABS, getConfig } from './utils/constants';
import { MissingConfig } from './components/MissingConfig';
import { filterVideosByDuration } from './utils/videoFilters';
import { filterVideosBySearch } from './utils/searchUtils';
import { sortVideos } from './utils/sortUtils';
import { useVideos } from './hooks/useVideos';
import { useSound } from './hooks/useSound';
import { SearchFilters } from './types/search';
import { SortOptions } from './types/sort';

export default function App() {
  const { SPREADSHEET_ID, API_KEY } = getConfig();
  const hasValidConfig = Boolean(SPREADSHEET_ID && API_KEY);

  const { videos, isLoading, error, loadVideos } = useVideos();
  const { playClick } = useSound();
  const [selectedTab, setSelectedTab] = React.useState(-1);
  const [sortOptions, setSortOptions] = React.useState<SortOptions>({
    field: 'publishedAt',
    direction: 'desc'
  });
  const [searchFilters, setSearchFilters] = React.useState<SearchFilters>({
    query: '',
    fields: ['title', 'channel', 'category']
  });

  const resetFilters = React.useCallback(async () => {
    playClick();
    setSelectedTab(-1);
    setSearchFilters({
      query: '',
      fields: ['title', 'channel', 'category']
    });
    if (hasValidConfig) {
      await loadVideos();
    }
  }, [loadVideos, playClick, hasValidConfig]);

  React.useEffect(() => {
    if (hasValidConfig) {
      loadVideos();
    }
  }, [loadVideos, hasValidConfig]);

  // Filtrage par recherche
  const filteredBySearch = React.useMemo(() =>
    filterVideosBySearch(videos, searchFilters),
    [videos, searchFilters]
  );

  // Filtrage par durée
  const filteredByDuration = React.useMemo(() =>
    selectedTab === -1
      ? filteredBySearch
      : filterVideosByDuration(filteredBySearch, SHEET_TABS[selectedTab]),
    [filteredBySearch, selectedTab]
  );

  // Tri final
  const sortedVideos = React.useMemo(
    () => sortVideos(filteredByDuration, sortOptions),
    [filteredByDuration, sortOptions]
  );

  if (!hasValidConfig) {
    return <MissingConfig />;
  }

  return (
    <div className="min-h-screen bg-youtube-bg-light dark:bg-neutral-900 overflow-x-hidden">
      <header className="bg-white dark:bg-neutral-800 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <button
                onClick={resetFilters}
                className="flex items-center gap-3 group"
                disabled={isLoading}
              >
                <img
                  src={`${import.meta.env.BASE_URL}youtube-logo.svg`}
                  alt="YouTube logo"
                  className="h-8 w-8"
                />
                <h1 className="text-xl font-semibold text-youtube-black dark:text-white flex items-center gap-2">
                  Mes Vidéos YouTube
                  <RefreshCw
                    className={`
                      h-5 w-5 text-youtube-gray-light transition-all
                      ${isLoading ? 'animate-spin' : 'group-hover:text-youtube-red'}
                    `}
                  />
                </h1>
              </button>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <SoundToggle />
              </div>
            </div>

            {!isLoading && !error && (
              <div className="flex items-center justify-between gap-4">
                <div className="w-full max-w-[280px]">
                  <SortSelect
                    options={sortOptions}
                    onOptionsChange={setSortOptions}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {!isLoading && !error && (
          <>
            <SearchBar
              filters={searchFilters}
              onFiltersChange={setSearchFilters}
            />
            <DurationTabs
              selectedTab={selectedTab}
              onTabChange={setSelectedTab}
              videos={filteredBySearch}
            />
          </>
        )}

        {isLoading && <LoadingState />}
        {error && <ErrorState message={error} />}
        {!isLoading && !error && <VideoGrid videos={sortedVideos} />}
      </main>
    </div>
  );
}

