import type { VideoData } from '../types/video.ts';
import type { SheetTab } from '../types/sheets.ts';
import { getDurationInMinutes } from './durationUtils.ts';

export function filterVideosByDuration(videos: VideoData[], tab: SheetTab | null): VideoData[] {
  if (!tab) return videos;

  return videos.filter(video => {
    if (video.duration === 'Inconnue') {
      return false;
    }
    const { min, max } = tab.durationRange;
    const duration = getDurationInMinutes(video.duration);
    return max === null
      ? duration >= (min as number)
      : duration >= (min as number) && duration < max;
  });
}

export function getVideoCountByDuration(videos: VideoData[], tab: SheetTab): number {
  return filterVideosByDuration(videos, tab).length;
}
