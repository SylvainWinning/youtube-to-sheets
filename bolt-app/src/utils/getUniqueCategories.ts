import type { VideoData } from '../types/video.ts';

export function getUniqueCategories(
  videos: VideoData[],
  sortOrder: 'asc' | 'desc'
): string[] {
  const uniqueCategories = new Set(
    videos
      .map(video => video.myCategory)
      .filter(category => category && category.trim() !== '')
  );
  return Array.from(uniqueCategories).sort((a, b) =>
    sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a)
  );
}
