import React from 'react';
import { Eye } from 'lucide-react';
import { VideoData } from '../types/video';
import { formatNumber } from '../utils/formatters';
import { formatDuration } from '../utils/durationUtils';
import { formatPublishDate } from '../utils/timeUtils';
import { playVideo } from '../utils/videoUtils';
import { useSound } from '../hooks/useSound';

interface VideoCardProps {
  video: VideoData;
}

export function VideoCard({ video }: VideoCardProps) {
  const { playClick } = useSound();

  const handleClick = () => {
    playClick();
    // Add a small delay before opening the video
    setTimeout(() => {
      playVideo(video);
    }, 150); // 150ms delay feels natural
  };

  return (
    <div
      onClick={handleClick}
      className="group cursor-pointer p-3 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] bg-neu-base dark:bg-neutral-700/50 shadow-[2px_2px_4px_#d1d9e6,_-2px_-2px_4px_#ffffff] dark:shadow-[2px_2px_4px_rgba(0,0,0,0.2),_-2px_-2px_4px_rgba(255,255,255,0.05)] hover:shadow-[4px_4px_8px_#d1d9e6,_-4px_-4px_8px_#ffffff] dark:hover:shadow-[4px_4px_8px_rgba(0,0,0,0.25),_-4px_-4px_8px_rgba(255,255,255,0.1)] flex flex-col"
    >
      <div className="relative aspect-video rounded-xl overflow-hidden mb-3 shadow-[inset_2px_2px_4px_rgba(209,217,230,0.4),_inset_-2px_-2px_4px_rgba(255,255,255,0.4)] dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),_inset_-2px_-2px_4px_rgba(255,255,255,0.05)]">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <img
          src={video.channelAvatar}
          alt={video.channel}
          className="absolute bottom-2 left-2 w-8 h-8 rounded-full border border-white shadow-md"
        />
        <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 text-white text-xs font-medium rounded">
          {formatDuration(video.duration)}
        </div>
      </div>

      <div className="flex flex-col flex-1">
        <h3 className="font-medium text-[14px] leading-5 text-youtube-black dark:text-white line-clamp-2 group-hover:text-youtube-red transition-colors mb-1">
          {video.title}
        </h3>

        <div className="flex items-center text-[13px] text-youtube-gray-dark dark:text-gray-400 mb-1">
          <div>{video.channel}</div>
        </div>

        <div className="mt-auto flex items-center gap-1 text-[13px] text-youtube-gray-dark dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {formatNumber(video.views)}
          </span>
          <span className="mx-1">•</span>
          <span>{formatPublishDate(video.publishedAt)}</span>
        </div>
      </div>
    </div>
  );
}
