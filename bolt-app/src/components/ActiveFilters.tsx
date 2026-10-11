import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export interface ActiveFilter {
  id: string;
  label: string;
  onRemove: () => void;
}

interface ActiveFiltersProps {
  resultCount: number;
  filters: ActiveFilter[];
  onClear: () => void;
}

export function ActiveFilters({ resultCount, filters, onClear }: ActiveFiltersProps) {
  const [announcement, setAnnouncement] = useState('');
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const clearButton = useRef<HTMLButtonElement>(null);
  const removedIndex = useRef<number | null>(null);
  const countLabel = `${resultCount} résultat${resultCount === 1 ? '' : 's'}`;
  const filterDescription = filters.map(filter => filter.label).join(', ');

  useEffect(() => {
    // Wait for a pause in typing; announce only this summary, never the grid.
    const timer = window.setTimeout(() => {
      setAnnouncement(`${countLabel}. ${filterDescription ? `Filtres actifs : ${filterDescription}.` : 'Aucun filtre actif.'}`);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [countLabel, filterDescription]);

  useLayoutEffect(() => {
    if (removedIndex.current !== null) {
      const next = buttons.current[Math.min(removedIndex.current, filters.length - 1)];
      (next ?? clearButton.current)?.focus({ preventScroll: true });
      removedIndex.current = null;
    }
  });

  return (
    <section aria-label="Résultats et filtres actifs" className="mb-5 text-youtube-black dark:text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <p className="font-semibold">{countLabel}</p>
        <button ref={clearButton} type="button" onClick={onClear}
          className="neu-button rounded-xl px-4 py-2 text-sm min-h-11">
          Tout effacer
        </button>
      </div>
      {filters.length > 0 ? (
        <ul aria-label="Filtres actifs" className="flex flex-wrap gap-2">
          {filters.map((filter, index) => (
            <li key={filter.id} className="max-w-full">
              <button type="button" ref={element => { buttons.current[index] = element; }}
                aria-label={`Supprimer le filtre ${filter.label}`}
                onClick={() => { removedIndex.current = index; filter.onRemove(); }}
                className="flex items-center gap-2 max-w-full min-h-11 rounded-xl border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-left">
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">{filter.label}</span>
                <X aria-hidden="true" className="w-4 h-4 shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-gray-600 dark:text-gray-300">Aucun filtre actif</p>}
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</p>
    </section>
  );
}
