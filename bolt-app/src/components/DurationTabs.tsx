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
}

export function DurationTabs({ selectedTab, onTabChange, videos }: DurationTabsProps) {
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

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        <div className="flex col-span-2 sm:col-span-1">
          <button
            onClick={() => onTabChange(-1)}
            className={`
              flex-1 rounded-l-lg px-3 py-2 flex items-center gap-2 transition-all duration-200
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
          <div key={tab.name} className="flex">
            <button
              onClick={() => onTabChange(index)}
              className={`
                flex-1 rounded-l-lg px-3 py-2 flex items-center gap-2 transition-all duration-200
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
