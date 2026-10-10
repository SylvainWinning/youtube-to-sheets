import type { VideoData } from '../types/video.ts';
import { channelCategories } from './channelCategories.ts';

export function getVideoCategory(video: VideoData): string {
  return video.myCategory?.trim()
    || channelCategories[video.channel?.trim() ?? '']
    || video.category?.trim()
    || '';
}

/**
 * Returns a new array of videos where the `myCategory` property is
 * automatically filled based on the video's channel name if not already set.
 * It looks up the channel name in the `channelCategories` mapping.
 *
 * @param videos Array of video objects to process.
 * @returns New array with categories assigned.
 */
export function assignCategories(videos: VideoData[]): VideoData[] {
  return videos.map((video) => {
    return { ...video, myCategory: getVideoCategory(video) };
  });
}
