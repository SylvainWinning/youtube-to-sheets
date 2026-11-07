import React from 'react';
import { SHEET_TABS } from '../utils/constants';
import { formatDurationRange } from '../utils/durationUtils';
import { getVideoCountByDuration } from '../utils/videoFilters';
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
          {SHEET_TABS.map((tab, index) => (
            <option key={tab.name} value={index}>
              {formatDurationRange(tab.durationRange.min, tab.durationRange.max)}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="duration-controls mb-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div role="group" aria-label="Tranches de durée" className="flex flex-1 min-w-0 flex-wrap items-center gap-1">
          <button type="button" aria-pressed={selectedTab === -1} onClick={() => onTabChange(-1)}
            className={`min-h-10 rounded-lg px-2 py-2 text-xs ${selectedTab === -1 ? 'filter-selected' : 'neu-button text-gray-700 dark:text-gray-100'}`}>
            Toutes durées
          </button>
        {SHEET_TABS.map((tab, index) => (
          <div key={tab.name} className="flex min-w-0">
            <button
              type="button"
              aria-pressed={selectedTab === index}
              onClick={() => onTabChange(index)}
              className={`
                min-h-10 min-w-0 rounded-lg px-2 py-2 flex items-center gap-1 transition-colors duration-150
                ${selectedTab === index
                  ? 'filter-selected'
                  : 'neu-button text-gray-700 dark:text-gray-100 hover:text-youtube-red-accessible dark:hover:text-youtube-red-accessible-dark '
                }
              `}
            >
              <span className="text-xs whitespace-nowrap">
                {formatDurationRange(tab.durationRange.min, tab.durationRange.max)}
              </span>
              <span className="tabular-nums text-xs text-gray-600 dark:text-gray-400">
                {tabCounts[index]}
              </span>
            </button>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
