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

const App: React.FC = () => {
  // États pour la recherche et les filtres
  const [filters, setFilters] = React.useState<SearchFilters>({
    query: '',
    fields: ['title', 'channel', 'category'],
  });
  const [selectedTab, setSelectedTab] = React.useState<number>(-1);
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);

  // Récupération des vidéos via le hook personnalisé
  const { videos, isLoading, error, loadVideos } = useVideos();

  // Chargement automatique des vidéos lors du montage du composant
  React.useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // Transformation des vidéos en tableau pour le composant DataTable
  const tableData = React.useMemo(() => {
    if (!videos || videos.length === 0) return null;

    // En-têtes du tableau
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

    // Lignes de données
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
            onClick={() => loadVideos()} // Relance le chargement des vidéos
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
            // Vous pouvez ajouter ici l’action de lecture aléatoire si nécessaire
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
