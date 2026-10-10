import React from 'react';
import { DurationTabs } from './DurationTabs';
import { getPlaylistLabel, PRIMARY_PLAYLIST_ID } from './PlaylistSelect';
import { SORT_OPTIONS } from '../types/sort';
import type { SortOptions } from '../types/sort';
import type { VideoData } from '../types/video';
import { getUniqueCategories } from '../utils/getUniqueCategories';
import { getOptionValue, getSelectedLabel } from '../utils/sort/utils';
import { getVideoCountByDuration } from '../utils/videoFilters';
import { SHEET_TABS } from '../utils/constants';

interface MobileFilterBarProps {
  videos: VideoData[];
  durationVideos: VideoData[];
  selectedTab: number;
  onTabChange: (index: number) => void;
  sortOptions: SortOptions | null;
  onSortOptionsChange: (options: SortOptions | null) => void;
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  selectedPlaylistId: string | null;
  onPlaylistChange: (playlistId: string | null) => void;
}

const sortChoices = [null, SORT_OPTIONS.PUBLISHED_DESC, SORT_OPTIONS.PUBLISHED_ASC];
const selectClass = 'neu-button w-full h-11 rounded-lg px-3 text-sm text-gray-700 dark:text-gray-100 [color-scheme:light] dark:[color-scheme:dark]';

export function MobileFilterBar({
  videos, durationVideos, selectedTab, onTabChange, sortOptions, onSortOptionsChange,
  selectedCategory, onCategoryChange, selectedPlaylistId, onPlaylistChange,
}: MobileFilterBarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelId = React.useId();
  const categories = React.useMemo(() => getUniqueCategories(videos), [videos]);
  const playlistIds = React.useMemo(() => [...new Set(videos.map(v => v.playlistId)
    .filter((id): id is string => Boolean(id)))].sort((a, b) => {
      if (a === PRIMARY_PLAYLIST_ID) return -1;
      if (b === PRIMARY_PLAYLIST_ID) return 1;
      return getPlaylistLabel(a).localeCompare(getPlaylistLabel(b), 'fr');
    }), [videos]);
  const resultCount = selectedTab === -1 ? durationVideos.length
    : getVideoCountByDuration(durationVideos, SHEET_TABS[selectedTab]);
  const activeFilters = Number(Boolean(selectedCategory)) + Number(Boolean(selectedPlaylistId)) + Number(Boolean(sortOptions));
  const playlistLabel = selectedPlaylistId ? getPlaylistLabel(selectedPlaylistId) : 'Toutes les playlists';

  const closePanel = () => {
    setIsOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };

  React.useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, [isOpen]);

  React.useEffect(() => {
    const media = window.matchMedia('(min-width: 640px)');
    const handleResize = () => { if (media.matches) setIsOpen(false); };
    media.addEventListener('change', handleResize);
    return () => media.removeEventListener('change', handleResize);
  }, []);

  return (
    <div ref={rootRef} className="sm:hidden mb-4" onKeyDown={event => {
      if (isOpen && event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault();
        closePanel();
      }
    }}>
      <div className="flex items-stretch gap-2">
        <DurationTabs compact selectedTab={selectedTab} onTabChange={onTabChange} videos={durationVideos} />
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={isOpen}
          aria-controls={isOpen ? panelId : undefined}
          onClick={() => setIsOpen(open => !open)}
          className="neu-button shrink-0 rounded-lg px-3 min-h-11 text-sm text-gray-700 dark:text-gray-100"
        >
          Filtres{activeFilters > 0 && <span className="ml-1">({activeFilters})</span>}
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-600 dark:text-gray-300" role="status" aria-live="polite">
        {resultCount} vidéo{resultCount === 1 ? '' : 's'} · {playlistLabel}
        {selectedCategory && ` · ${selectedCategory}`}
      </p>
      {isOpen && (
        <section id={panelId} aria-label="Filtres des vidéos" className="mt-3 rounded-xl border border-gray-200 dark:border-neutral-700 p-3 bg-white dark:bg-neutral-800">
          <div className="grid gap-3">
            <label className="grid gap-1 text-sm text-gray-700 dark:text-gray-200">
              Trier par
              <select className={selectClass} value={getOptionValue(sortOptions)} onChange={event =>
                onSortOptionsChange(sortChoices.find(choice => getOptionValue(choice) === event.target.value) ?? null)}>
                {sortChoices.map(choice => <option key={getOptionValue(choice)} value={getOptionValue(choice)}>{getSelectedLabel(choice)}</option>)}
              </select>
            </label>
            {categories.length > 0 && (
              <label className="grid gap-1 text-sm text-gray-700 dark:text-gray-200">
                Catégorie
                <select className={selectClass} value={selectedCategory ?? ''} onChange={event => onCategoryChange(event.target.value || null)}>
                  <option value="">Toutes les catégories</option>
                  {categories.map(category => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
            )}
            {playlistIds.length > 1 && (
              <label className="grid gap-1 text-sm text-gray-700 dark:text-gray-200">
                Playlist
                <select className={selectClass} value={selectedPlaylistId ?? ''} onChange={event => onPlaylistChange(event.target.value || null)}>
                  <option value="">Toutes les playlists</option>
                  {playlistIds.map(id => <option key={id} value={id}>{getPlaylistLabel(id)}</option>)}
                </select>
              </label>
            )}
            <button type="button" className="neu-button rounded-lg px-3 min-h-11 text-sm text-gray-700 dark:text-gray-100" onClick={closePanel}>
              Voir {resultCount} vidéo{resultCount === 1 ? '' : 's'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
