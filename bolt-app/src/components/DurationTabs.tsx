import React from 'react';
import { Clock } from 'lucide-react';
import { SHEET_TABS } from '../utils/constants';
import { formatDurationRange } from '../utils/durationUtils';
import { getVideoCountByDuration } from '../utils/videoFilters';
import { DURATION_LIMITS, filterByDurationSelection, getDurationLabel } from '../utils/durationSelection';
import { VideoData } from '../types/video';

interface DurationTabsProps {
  selectedTab: number;
  onTabChange: (index: number) => void;
  videos: VideoData[];
  compact?: boolean;
}

export function DurationTabs({ selectedTab, onTabChange, videos, compact = false }: DurationTabsProps) {
  const tabCounts = React.useMemo(() =>
    SHEET_TABS.map(tab => getVideoCountByDuration(videos, tab)),
    [videos]
  );

  if (compact) {
    return (
      <div className="flex flex-1 min-w-0">
        <select
          aria-label="Durée"
          value={selectedTab}
          onChange={event => onTabChange(Number(event.target.value))}
          className="neu-button h-11 min-w-0 flex-1 rounded-lg px-2 text-sm text-gray-700 dark:text-gray-100 [color-scheme:light] dark:[color-scheme:dark]"
        >
          <option value={-1}>Toutes durées</option>
          <optgroup label="Temps disponible">
            {DURATION_LIMITS.map(limit => <option key={limit} value={-limit}>Moins de {limit} min</option>)}
          </optgroup>
          <optgroup label="Tranches de durée">
          {SHEET_TABS.map((tab, index) => (
            <option key={tab.name} value={index}>
              {formatDurationRange(tab.durationRange.min, tab.durationRange.max)}
            </option>
          ))}
          </optgroup>
        </select>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        <div className="flex min-w-0 min-[380px]:col-span-2 sm:col-span-1 items-center gap-1 neu-button rounded-lg px-2">
          <Clock aria-hidden="true" className="w-4 h-4 shrink-0" />
          <select aria-label="Durée maximale" value={selectedTab >= 0 ? 'range' : selectedTab}
            onChange={event => onTabChange(Number(event.target.value))}
            className="min-w-0 flex-1 h-10 bg-transparent text-sm text-gray-700 dark:text-gray-100 [color-scheme:light] dark:[color-scheme:dark]">
            <option value={-1}>Toutes durées</option>
            {selectedTab >= 0 && <option value="range" disabled>Par tranche</option>}
            {DURATION_LIMITS.map(limit => <option key={limit} value={-limit}>{getDurationLabel(-limit)}</option>)}
          </select>
          <span className="neu-badge px-2 py-0.5 rounded-full text-xs text-gray-700 dark:text-gray-100">
            {filterByDurationSelection(videos, selectedTab).length}
          </span>
        </div>

        {SHEET_TABS.map((tab, index) => (
          <div key={tab.name} className="flex min-w-0">
            <button
              type="button"
              aria-pressed={selectedTab === index}
              onClick={() => onTabChange(index)}
              className={`
                flex-1 min-w-0 rounded-lg px-2 sm:px-3 py-2 flex items-center gap-1 sm:gap-2 transition-all duration-200
                ${selectedTab === index
                  ? 'filter-selected'
                  : 'neu-button text-gray-700 dark:text-gray-100 hover:text-youtube-red-accessible dark:hover:text-youtube-red-accessible-dark '
                }
              `}
            >
              <span className="text-sm whitespace-nowrap">
                {formatDurationRange(tab.durationRange.min, tab.durationRange.max)}
              </span>
              <span className="neu-badge px-2 py-0.5 rounded-full text-xs text-gray-700 dark:text-gray-100">
                {tabCounts[index]}
              </span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
