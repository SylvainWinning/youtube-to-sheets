import { VideoData } from '../types/video';
import { SheetTab } from '../types/sheets';
import { getDurationInMinutes } from './durationUtils';

export function filterVideosByDuration(videos: VideoData[], tab: SheetTab | null): VideoData[] {
  if (!tab) return videos;
  
  return videos.filter(video => {
    const duration = getDurationInMinutes(video.duration);
    const { min, max } = tab.durationRange;
    return max === null 
      ? duration >= min 
      : duration >= min && duration < max;
  });
}

export function getVideoCountByDuration(videos: VideoData[], tab: SheetTab): number {
  return filterVideosByDuration(videos, tab).length;
}