import { getCategoryLabel } from '../utils/categoryLabels';
import React from 'react';
import { X } from 'lucide-react';
import { DURATION_LIMITS, getDurationLabel } from '../utils/durationSelection';
import { SHEET_TABS } from '../utils/constants';
import { formatDurationRange } from '../utils/durationUtils';
import { DurationTabs } from './DurationTabs';
import { getPlaylistLabel, PRIMARY_PLAYLIST_ID } from './PlaylistSelect';
import { SORT_OPTIONS } from '../types/sort';
import type { SortOptions } from '../types/sort';
import type { VideoData } from '../types/video';
import { getUniqueCollections, getUniqueTopics } from '../utils/videoFacets';
import { getOptionValue, getSelectedLabel } from '../utils/sort/utils';
import { filterByDurationSelection } from '../utils/durationSelection';
import { getPlaylistIds } from '../utils/videoLibrary';
import { ReturnToTop } from './ReturnToTop';

interface MobileFilterBarProps {
  videos: VideoData[];
  durationVideos: VideoData[];
  selectedTab: number;
  onTabChange: (index: number) => void;
  sortOptions: SortOptions | null;
  onSortOptionsChange: (options: SortOptions | null) => void;
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  selectedCollection: string | null;
  onCollectionChange: (collection: string | null) => void;
  selectedPlaylistId: string | null;
  onPlaylistChange: (playlistId: string | null) => void;
  stuck: boolean;
  searching: boolean;
  onReturnTop: () => void;
}

const sortChoices = [null, SORT_OPTIONS.PUBLISHED_DESC, SORT_OPTIONS.PUBLISHED_ASC];
const selectClass = 'neu-button w-full h-11 rounded-lg px-3 text-sm text-gray-700 dark:text-gray-100 [color-scheme:light] dark:[color-scheme:dark]';

export function MobileFilterBar({
  videos, durationVideos, selectedTab, onTabChange, sortOptions, onSortOptionsChange,
  selectedCategory, onCategoryChange, selectedPlaylistId, onPlaylistChange,
  selectedCollection, onCollectionChange,
  stuck, searching, onReturnTop,
}: MobileFilterBarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const [durationMode, setDurationMode] = React.useState<'maximum' | 'range'>(selectedTab >= 0 ? 'range' : 'maximum');
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelId = React.useId();
  const categories = React.useMemo(() => getUniqueTopics(videos), [videos]);
  const collections = React.useMemo(() => getUniqueCollections(videos), [videos]);
  const playlistIds = React.useMemo(() => getPlaylistIds(videos).sort((a, b) => {
      if (a === PRIMARY_PLAYLIST_ID) return -1;
      if (b === PRIMARY_PLAYLIST_ID) return 1;
      return getPlaylistLabel(a).localeCompare(getPlaylistLabel(b), 'fr');
    }), [videos]);
  const resultCount = filterByDurationSelection(durationVideos, selectedTab).length;
  const activeFilters = Number(Boolean(selectedCategory)) + Number(Boolean(selectedCollection)) + Number(Boolean(selectedPlaylistId)) + Number(selectedTab !== -1);

  const closePanel = () => dialogRef.current?.close();

  React.useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen]);

  React.useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px) and (min-height: 600px)');
    const handleResize = () => { if (media.matches) setIsOpen(false); };
    media.addEventListener('change', handleResize);
    return () => media.removeEventListener('change', handleResize);
  }, []);

  return (
    <div className="library-filters-compact relative">
      <div className="flex items-stretch gap-2">
        <DurationTabs compact selectedTab={selectedTab} onTabChange={onTabChange} videos={durationVideos} />
        <button
          ref={triggerRef}
          type="button"
          aria-label={activeFilters > 0 ? `Filtres (${activeFilters})` : 'Filtres'}
          aria-expanded={isOpen}
          aria-controls={isOpen ? panelId : undefined}
          onClick={() => { setDurationMode(selectedTab >= 0 ? 'range' : 'maximum'); setIsOpen(true); }}
          className="neu-button shrink-0 rounded-lg px-3 min-h-11 text-sm text-gray-700 dark:text-gray-100"
        >
          Filtres{activeFilters > 0 && <span className="ml-1">({activeFilters})</span>}
        </button>
        {stuck && <ReturnToTop onReturn={onReturnTop} />}
      </div>
      {isOpen && (
        <dialog ref={dialogRef} id={panelId} aria-label="Filtres des vidéos"
          onClose={() => { setIsOpen(false); triggerRef.current?.focus({ preventScroll: true }); }}
          onCancel={event => { event.preventDefault(); closePanel(); }}
          onKeyDown={event => {
            if (event.key !== 'Tab') return;
            const controls = event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), select:not([disabled]), a[href], input:not([disabled])');
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }}
          onClick={event => {
            const rect = event.currentTarget.getBoundingClientRect();
            if (event.target === event.currentTarget && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) closePanel();
          }} style={{ maxHeight: 'min(80dvh, 640px)' }}
          className="mobile-filter-dialog fixed left-4 right-4 bottom-4 top-auto m-0 w-[calc(100%-2rem)] max-w-none flex flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg backdrop:bg-black/50 text-youtube-black dark:text-white">
          <div className="flex shrink-0 items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-neutral-700">
            <h2 className="font-medium text-youtube-black dark:text-white">Filtres</h2>
            <button type="button" aria-label="Fermer les filtres" autoFocus onClick={closePanel} className="neu-button rounded-lg w-11 h-11 flex items-center justify-center"><X aria-hidden="true" className="w-4 h-4" /></button>
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain grid gap-4 p-3">
            <fieldset className="duration-mode-switch grid grid-cols-2 gap-1 rounded-lg p-1 bg-gray-100 dark:bg-neutral-900">
              <legend className="sr-only">Mode de durée</legend>
              <button type="button" aria-pressed={durationMode === 'maximum'} onClick={() => setDurationMode('maximum')}
                className={`min-h-11 rounded-md px-2 text-sm ${durationMode === 'maximum' ? 'duration-mode-active' : 'text-gray-600 dark:text-neutral-300'}`}>Temps disponible</button>
              <button type="button" aria-pressed={durationMode === 'range'} onClick={() => setDurationMode('range')}
                className={`min-h-11 rounded-md px-2 text-sm ${durationMode === 'range' ? 'duration-mode-active' : 'text-gray-600 dark:text-neutral-300'}`}>Par tranche</button>
            </fieldset>
            <p className="text-xs text-gray-600 dark:text-neutral-300">Durée active : {getDurationLabel(selectedTab)}</p>
            {durationMode === 'maximum' && <fieldset className="duration-options grid grid-cols-3 gap-2">
              <legend className="sr-only">Temps disponible</legend>
              {[-1, ...DURATION_LIMITS.map(limit => -limit)].map(value => <button key={value} type="button" aria-pressed={selectedTab === value} onClick={() => onTabChange(value)}
                className={`min-h-11 rounded-lg px-2 text-sm ${selectedTab === value ? 'filter-selected' : 'neu-button text-gray-700 dark:text-gray-200'}`}>{getDurationLabel(value)}</button>)}
            </fieldset>}
            {durationMode === 'range' && <fieldset className="duration-options grid grid-cols-2 gap-2">
              <legend className="sr-only">Par tranche</legend>
              {SHEET_TABS.map((tab, index) => <button key={tab.name} type="button" aria-pressed={selectedTab === index} onClick={() => onTabChange(index)}
                className={`min-h-11 rounded-lg px-2 text-sm ${selectedTab === index ? 'filter-selected' : 'neu-button text-gray-700 dark:text-gray-200'}`}>{formatDurationRange(tab.durationRange.min, tab.durationRange.max)}</button>)}
            </fieldset>}
            <label className="grid gap-1 text-sm text-gray-700 dark:text-gray-200">
              Trier par
              <select className={selectClass} value={getOptionValue(sortOptions)} onChange={event =>
                onSortOptionsChange(sortChoices.find(choice => getOptionValue(choice) === event.target.value) ?? null)}>
                {sortChoices.map(choice => <option key={getOptionValue(choice)} value={getOptionValue(choice)}>{!choice && searching ? 'Pertinence' : getSelectedLabel(choice)}</option>)}
              </select>
            </label>
            {categories.length > 0 && (
              <label className="grid gap-1 text-sm text-gray-700 dark:text-gray-200">
                Thème des vidéos
                <select className={selectClass} value={selectedCategory ?? ''} onChange={event => onCategoryChange(event.target.value || null)}>
                  <option value="">Tous les thèmes</option>
                  {categories.map(category => <option key={category} value={category}>{getCategoryLabel(category)}</option>)}
                </select>
              </label>
            )}
            {collections.length > 0 && (
              <label className="grid gap-1 text-sm text-gray-700 dark:text-gray-200">
                Collection
                <select className={selectClass} value={selectedCollection ?? ''} onChange={event => onCollectionChange(event.target.value || null)}>
                  <option value="">Toutes les collections</option>
                  {collections.map(collection => <option key={collection} value={collection}>{getCategoryLabel(collection)}</option>)}
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
          </div>
          <div className="shrink-0 p-3 border-t border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
            <button type="button" className="primary-action w-full rounded-lg px-3 min-h-11 text-sm" onClick={closePanel}>
              Voir {resultCount} vidéo{resultCount === 1 ? '' : 's'}
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
