import { getVideoCategory } from './assignCategories.ts';
import type { VideoData } from '../types/video.ts';

/** Read normalized categories without mutating videos; legacy input remains supported. */
export function getUniqueCategories(
  videos: VideoData[],
  order: 'asc' | 'desc' = 'asc',
): string[] {
  const uniqueCategories = new Set<string>();
  videos.forEach((video) => {
    const cat = getVideoCategory(video);
    if (cat) {
      uniqueCategories.add(cat);
    }
  });
  return Array.from(uniqueCategories).sort((a, b) =>
    order === 'desc' ? b.localeCompare(a) : a.localeCompare(b),
  );
}
