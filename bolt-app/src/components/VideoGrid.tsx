import React from 'react';
import { VideoCard } from './VideoCard';
import { VideoData } from '../types/video';

interface VideoGridProps {
  videos: VideoData[];
}

export function VideoGrid({ videos }: VideoGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-4 gap-y-8">
      {videos.map((video, index) => (
        <VideoCard key={index} video={video} />
      ))}
    </div>
  );
}