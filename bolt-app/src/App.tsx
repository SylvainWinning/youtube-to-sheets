import React from 'react';
import { RefreshCw } from 'lucide-react';
import { SearchBar } from './components/SearchBar';
import { DurationTabs } from './components/DurationTabs';
import { ShuffleButton } from './components/ShuffleButton';
import { DataTable } from './components/DataTable';
import { CategorySelect } from './components/CategorySelect';
import { ThemeToggle } from './components/ui/ThemeToggle';
import { SoundToggle } from './components/ui/SoundToggle';
import { useVideos } from './hooks/useVideos';
import { SearchFilters } from './types/search';
import { VideoData } from './types/video';
import { getConfig } from './utils/constants';  // <-- import de getConfig

const App: React.FC = () => {
  // Récupération de la configuration (ID et clé API)
  const config = getConfig();

  // États pour la recherche et les filtres
  const [filters, setFilters] = React.useState<SearchFilters>({
    query: '',
    fields: ['title', 'channel', 'category'],
  });
  const [selectedTab, setSelectedTab] = React.useState<number>(-1);
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);

  /**
   * On transmet à useVideos() une chaîne non nulle lorsqu’il faut forcer
   * l’utilisation du fichier local (config.error ou config.help).
   * Cela permet de basculer automatiquement vers videos.json si SPREADSHEET_ID ou
   * YOUTUBE_API_KEY est manquant ou invalide.
   */
  const { videos, isLoading, error, loadVideos } = useVideos(config.error ?? config.help);

  // Chargement automatique des vidéos lors du montage du composant
  React.useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // Conversion des vidéos en tableau pour DataTable
  const tableData = React.useMemo(() => {
    if (!videos || videos.length === 0) return null;
    const headers = [
      'channelAvatar',
      'title',
      'link',
      'channel',
      'publishedAt',
      'duration',
      'views',
      'likes',
      'comments',
      'shortDescription',
      'tags',
      'category',
      'thumbnail',
    ];
    const rows = videos.map((video: VideoData) => [
      video.channelAvatar ?? '',
      video.title,
      video.link,
      video.channel,
      video.publishedAt,
      video.duration,
      video.views,
      video.likes,
      video.comments,
      video.shortDescription,
      video.tags,
      video.category,
      video.thumbnail,
    ]);
    return [headers, ...rows];
  }, [videos]);

  return (
    <div className="flex flex-col gap-4 p-4 max-w-5xl mx-auto">
      {/* En-tête avec bouton de rafraîchissement, thème et son */}
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mes Vidéos YouTube</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
            onClick={() => loadVideos()}
            title="Rafraîchir"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <ThemeToggle />
          <SoundToggle />
        </div>
      </header>

      {/* Barre de recherche */}
      <SearchBar filters={filters} onFiltersChange={setFilters} />

      {/* Sélecteur de catégories */}
      <CategorySelect
        videos={videos}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        className="mb-4"
      />

      {/* Onglets de durée */}
      <DurationTabs
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
        videos={videos}
      />

      {/* Bouton de lecture aléatoire global */}
      <div className="mb-4">
        <ShuffleButton
          onClick={() => {
            // Action pour la lecture aléatoire (optionnelle)
          }}
          disabled={videos.length === 0}
        />
      </div>

      {/* Tableau des vidéos */}
      <DataTable data={tableData} isLoading={isLoading} error={error} />
    </div>
  );
};

export default App;
