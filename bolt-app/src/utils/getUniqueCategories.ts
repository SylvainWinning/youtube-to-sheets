import type { VideoData } from '../types/video.ts';

/**
 * Extract a list of unique categories from the provided videos.
 *
 * The function will look at both the `myCategory` property and the
 * fallback `category` property on each video. Empty or undefined values
 * are ignored. The resulting array is sorted alphabetically.
 *
 * @param videos      An array of video objects.
 * @returns          An alphabetically sorted array of unique category names.
 */
export function getUniqueCategories(videos: VideoData[]): string[] {
  const uniqueCategories = new Set(
    videos
      .map((video) => video.myCategory ?? video.category ?? '')
      .filter((category) => category && category.trim() !== '')
  );
  return Array.from(uniqueCategories).sort((a, b) => a.localeCompare(b));
}
