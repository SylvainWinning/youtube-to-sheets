import { VideoData } from '../types/video';
import { channelCategories } from './channelCategories';

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
    const newVideo: VideoData = { ...video };
    const hasCustomCategory = newVideo.myCategory && newVideo.myCategory.trim() !== '';
    // Only assign if no custom category is set
    if (!hasCustomCategory) {
      const channelName = newVideo.channel?.trim();
      if (channelName && channelCategories[channelName]) {
        newVideo.myCategory = channelCategories[channelName];
      }
    }
    return newVideo;
  });
}
