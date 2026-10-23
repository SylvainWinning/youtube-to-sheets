import type { VideoData } from '../types/video.ts';
import { getVideoIdentity } from './videoLibrary.ts';
import rules from '../data/categoryRules.json' with { type: 'json' };

export interface CategoryRules {
  migrationComplete?: boolean;
  channels: Record<string, string>;
  videos: Record<string, string>;
  legacyNames: Record<string, string>;
}
export const UNCLASSIFIED = 'Non classées';

export function getVideoCategory(video: VideoData, mapping: CategoryRules = rules): string {
  const personal = video.myCategory?.trim();
  if (personal) return personal;
  let videoId = '';
  try {
    const identity = getVideoIdentity(video);
    if (identity.startsWith('youtube:')) videoId = identity.slice(8);
  } catch { /* Legacy fixture without a link. */ }
  return mapping.videos[videoId]?.trim()
    || (video.channelId ? mapping.channels[video.channelId]?.trim()
      || (mapping.migrationComplete === false ? mapping.legacyNames[video.channel?.trim() ?? '']?.trim() : undefined)
      : mapping.legacyNames[video.channel?.trim() ?? '']?.trim())
    || UNCLASSIFIED;
}

/** Normalize once at ingestion without changing source objects or personal categories. */
export function assignCategories(videos: VideoData[], mapping: CategoryRules = rules): VideoData[] {
  return videos.map(video => ({ ...video, myCategory: getVideoCategory(video, mapping) }));
}
