import type { VideoData } from '../../../types/video.ts';

export function mapRowToVideo(row: any[]): VideoData {
  const safeString = (value: any, defaultValue: string = ''): string => {
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }
    return String(value);
  };

  return {
    channelAvatar: safeString(row[0]), // Column A for channel avatar
    title: safeString(row[1]),         // Column B
    link: safeString(row[2]),          // Column C
    channel: safeString(row[3]),       // Column D
    publishedAt: safeString(row[4], new Date().toISOString()),
    duration: safeString(row[5], '00:00'),
    views: safeString(row[6], '0'),
    likes: safeString(row[7], '0'),
    comments: safeString(row[8], '0'),
    shortDescription: safeString(row[9]),
    tags: safeString(row[10]),
    category: safeString(row[11], 'Non catégorisé'), // Column L for category
    thumbnail: safeString(row[12]), // Column M for thumbnail
  };
}
