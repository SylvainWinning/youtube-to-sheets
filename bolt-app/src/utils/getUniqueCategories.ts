import { channelCategories } from './channelCategories';
import type { VideoData } from '../types/video.ts';

/**
 * Extract a list of unique categories from the provided videos.
 *
 * The function will look at both the `myCategory` property and the
 * fallback `category` property on each video. Empty or undefined values
 * are ignored. The resulting array is sorted alphabetically.
 *
 * @param videos  An array of video objects.
 * @returns      An alphabetically sorted array of unique category names.
 */
export function getUniqueCategories(videos: VideoData[]): string[] {
  const uniqueCategories = new Set<string>();
  videos.forEach((video) => {
    let cat: string | undefined | null = (video as any).myCategory ?? (video as any).category;
    if (!cat || cat.trim() === '') {
      const mapped = (channelCategories as any)[(video as any).channel as string];
      if (mapped) {
        cat = mapped;
        // assign mapped category to myCategory so other parts of the app can use it
        (video as any).myCategory = mapped;
      }
    }
    if (cat && cat.trim() !== '') {
      uniqueCategories.add(cat);
    }
  });
  return Array.from(uniqueCategories).sort((a, b) => a.localeCompare(b));
}
