import React from 'react';
import { RefreshCw } from 'lucide-react';

// Import components from the project
import { SearchBar } from './components/SearchBar';
import { DurationTabs } from './components/DurationTabs';
import { ShuffleButton } from './components/ShuffleButton';
import { DataTable } from './components/DataTable';
import { CategorySelect } from './components/CategorySelect';
import { ThemeToggle } from './components/ui/ThemeToggle';
import { SoundToggle } from './components/ui/SoundToggle';

// Types for filters and video data
import { SearchFilters } from './types/search';
import { VideoData } from './types/video';

// A minimal App component that composes the imported components together.
// This file was reintroduced after being removed inadvertently to ensure the
// project builds correctly. It uses default values for props to avoid
// compilation errors. You can enhance this layout later as needed.

const App: React.FC = () => {
  // State for search filters
  const [filters, setFilters] = React.useState<SearchFilters>({
    query: '',
    fields: ['title', 'channel', 'category'],
  });

  // State for selected duration tab
  const [selectedTab, setSelectedTab] = React.useState<number>(-1);

  // Placeholder videos data (empty array for now)
  const [videos, setVideos] = React.useState<VideoData[]>([]);

  // Placeholder category selection
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4 p-4 max-w-5xl mx-auto">
      {/* Header with title and control buttons */}
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mes Vidéos YouTube</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
            onClick={() => {
              // Refresh action placeholder
            }}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <ThemeToggle />
          <SoundToggle />
        </div>
      </header>

      {/* Search bar */}
      <SearchBar filters={filters} onFiltersChange={setFilters} />

      {/* Category selector */}
      <CategorySelect
        videos={videos}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        className="mb-4"
      />

      {/* Duration tabs with shuffle button inside */}
      <DurationTabs
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
        videos={videos}
      />

      {/* Standalone shuffle button (for demonstration) */}
      <div className="mb-4">
        <ShuffleButton
          onClick={() => {
            // Random shuffle action placeholder
          }}
          disabled={videos.length === 0}
        />
      </div>

      {/* Data table displaying video data */}
      <DataTable data={null} isLoading={false} error={null} />
    </div>
  );
};

export default App;
