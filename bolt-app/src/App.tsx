import React from 'react';
import { RefreshCw } from 'lucide-react';
import { SearchBar } from './components/SearchBar';
import { DurationTabs } from './components/DurationTabs';
import { ShuffleButton } from './components/ShuffleButton';
import { CategorySelect } from './components/CategorySelect';
import { ThemeToggle } from './components/ui/ThemeToggle';
import { SoundToggle } from './components/ui/SoundToggle';
import { useVideos } from './hooks/useVideos';
import { SearchFilters } from './types/search';
import { VideoData } from './types/video';
import { SHEET_TABS, getConfig } from './utils/constants';
import { getDurationInMinutes } from './utils/durationUtils';
import { VideoGrid } from './components/VideoGrid';

const App: React.FC = () => {
  // Récupération de la configuration (Sheet ID/API) et choix des données locales si besoin
  const config = getConfig();

  // Gestion de la recherche
  const [filters, setFilters] = React.useState<SearchFilters>({
    query: '',
    fields: ['title', 'channel', 'category'],
  });

  // Onglet de durée sélectionné (-1 = toutes durées)
  const [selectedTab, setSelectedTab] = React.useState<number>(-1);

  // Catégorie sélectionnée
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);

  // Chargement des vidéos via le hook personnalisé
  const { videos, isLoading, error, loadVideos } = useVideos(config.error ?? config.help);

  // Charge les vidéos au montage du composant
  React.useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  /**
   * Applique successivement :
   * 1. La recherche textuelle dans les champs spécifiés.
   * 2. Le filtre de catégorie (genre/playlist).
   * 3. Le filtre de durée selon l’onglet sélectionné.
   */
  const filteredVideos = React.useMemo(() => {
    let list = videos;

    // Filtre par texte (titre, chaîne, catégorie)
    const query = filters.query.trim().toLowerCase();
    if (query.length > 0) {
      list = list.filter((video) =>
        filters.fields.some((field) => {
          const value = (video as any)[field];
          return typeof value === 'string' && value.toLowerCase().includes(query);
        }),
      );
    }

    // Filtre par catégorie
    if (selectedCategory) {
      list = list.filter((video) => video.category === selectedCategory);
    }

    // Filtre par durée selon l’onglet
    if (selectedTab >= 0) {
      const { min, max } = SHEET_TABS[selectedTab].durationRange;
      list = list.filter((video) => {
        // Cas Inconnue : la durée est littéralement "Inconnue"
        if (min === null && max === null) {
          return video.duration === 'Inconnue';
        }
        const minutes = getDurationInMinutes(video.duration);
        if (max === null) {
          return minutes >= (min as number);
        }
        return minutes >= (min as number) && minutes < max;
      });
    }

    return list;
  }, [videos, filters, selectedCategory, selectedTab]);

  return (
    <div className="flex flex-col gap-6 p-4 max-w-7xl mx-auto">
      {/* En-tête avec rafraîchissement, thème et son */}
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

      {/* Affiche un message d’erreur si besoin */}
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded mb-4">
          {error}
        </div>
      )}

      {/* Grille de vidéos ou loader */}
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-b-2 border-blue-500 rounded-full"></div>
        </div>
      ) : (
        <VideoGrid videos={filteredVideos as VideoData[]} />
      )}
    </div>
  );
};

export default App;
