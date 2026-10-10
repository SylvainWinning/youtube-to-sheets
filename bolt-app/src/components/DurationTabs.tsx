import React from 'react';
import { Clock } from 'lucide-react';
import { SHEET_TABS } from '../utils/constants';
import { formatDurationRange } from '../utils/durationUtils';
import { getVideoCountByDuration } from '../utils/videoFilters';
import { VideoData } from '../types/video';
import { ShuffleButton } from './ShuffleButton';
import { getRandomVideo, playVideo } from '../utils/videoUtils';
import { audioPlayer } from '../utils/audio';

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

  const handleShuffle = React.useCallback((index: number) => {
    const tab = index === -1 ? null : SHEET_TABS[index];
    const randomVideo = getRandomVideo(videos, tab);
    if (randomVideo) {
      audioPlayer.play();
      playVideo(randomVideo);
    }
  }, [videos]);

  if (compact) {
    const count = selectedTab === -1 ? videos.length : tabCounts[selectedTab];
    const label = selectedTab === -1 ? 'Toutes durées'
      : formatDurationRange(SHEET_TABS[selectedTab].durationRange.min, SHEET_TABS[selectedTab].durationRange.max);
    return (
      <div className="flex flex-1 min-w-0">
        <select
          aria-label="Durée"
          value={selectedTab}
          onChange={event => onTabChange(Number(event.target.value))}
          className="neu-button h-11 min-w-0 flex-1 rounded-l-lg px-2 text-sm text-gray-700 dark:text-gray-100 [color-scheme:light] dark:[color-scheme:dark]"
        >
          <option value={-1}>Toutes durées</option>
          {SHEET_TABS.map((tab, index) => (
            <option key={tab.name} value={index}>
              {formatDurationRange(tab.durationRange.min, tab.durationRange.max)}
            </option>
          ))}
        </select>
        <ShuffleButton
          onClick={() => handleShuffle(selectedTab)}
          disabled={count === 0}
          label={`Lecture aléatoire : ${label}`}
          className="min-w-11"
        />
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        <div className="flex min-w-0 min-[380px]:col-span-2 sm:col-span-1">
          <button
            onClick={() => onTabChange(-1)}
            className={`
              flex-1 min-w-0 rounded-l-lg px-2 sm:px-3 py-2 flex items-center gap-1 sm:gap-2 transition-all duration-200
              ${selectedTab === -1 
                ? 'shadow-neu-pressed dark:shadow-neu-pressed-dark text-youtube-red dark:text-youtube-red' 
                : 'neu-button text-gray-700 dark:text-gray-100 hover:text-youtube-red dark:hover:text-youtube-red hover:bg-white/50 dark:hover:bg-white/5'
              }
            `}
          >
            <Clock className="w-4 h-4" />
            <span className="text-sm">Toutes durées</span>
            <span className="ml-1 neu-badge px-2 py-0.5 rounded-full text-xs text-gray-700 dark:text-gray-100">
              {videos.length}
            </span>
          </button>
          <ShuffleButton
            onClick={() => handleShuffle(-1)}
            disabled={videos.length === 0}
          />
        </div>
        
        {SHEET_TABS.map((tab, index) => (
          <div key={tab.name} className="flex min-w-0">
            <button
              onClick={() => onTabChange(index)}
              className={`
                flex-1 min-w-0 rounded-l-lg px-2 sm:px-3 py-2 flex items-center gap-1 sm:gap-2 transition-all duration-200
                ${selectedTab === index 
                  ? 'shadow-neu-pressed dark:shadow-neu-pressed-dark text-youtube-red dark:text-youtube-red' 
                  : 'neu-button text-gray-700 dark:text-gray-100 hover:text-youtube-red dark:hover:text-youtube-red hover:bg-white/50 dark:hover:bg-white/5'
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
            <ShuffleButton
              onClick={() => handleShuffle(index)}
              disabled={tabCounts[index] === 0}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
