import type { VideoData } from '../types/video.ts';
import { getVideoCategory, UNCLASSIFIED } from './assignCategories.ts';
import { getVideoIdentity } from './videoLibrary.ts';
import topicRules from '../data/topicRules.json' with { type: 'json' };

export const COLLECTIONS = ['Youtuber pref', 'Pause dej'] as const;
export function isCollection(value: string): boolean {
  return COLLECTIONS.some(collection => collection === value);
}

interface TopicRules {
  channels: Record<string, string | string[]>;
  videos: Record<string, string | string[]>;
  youtubeCategories: Record<string, string>;
}
const unique = (values: string[]) => [...new Set(values.map(value => value.trim()).filter(Boolean))];

/** Personal categories remain authoritative; collections gain an independent topic. */
export function getVideoTopics(video: VideoData, rules: TopicRules = topicRules): string[] {
  if (video.topics?.length) return unique(video.topics);
  const personal = video.myCategory?.trim();
  if (personal && !isCollection(personal) && personal !== UNCLASSIFIED) return [personal];
  const category = getVideoCategory(video);
  const id = video.link ? getVideoIdentity(video).replace(/^youtube:/, '') : '';
  const configured = rules.videos[id] ?? (video.channelId ? rules.channels[video.channelId] : undefined);
  const topics = configured ? unique(Array.isArray(configured) ? configured : [configured])
    : [!isCollection(category) && category !== UNCLASSIFIED ? category
      : rules.youtubeCategories[video.category ?? ''] ?? UNCLASSIFIED];
  return topics.length ? topics : [UNCLASSIFIED];
}

export function getVideoCollections(video: VideoData): string[] {
  const category = getVideoCategory(video);
  return unique([...(video.collections ?? []), ...(isCollection(category) ? [category] : [])]);
}

export function getUniqueTopics(videos: VideoData[]): string[] {
  return unique(videos.flatMap(video => getVideoTopics(video))).sort((a, b) => a.localeCompare(b, 'fr'));
}
export function getUniqueCollections(videos: VideoData[]): string[] {
  return unique(videos.flatMap(getVideoCollections));
}

export function filterVideoFacets(videos: VideoData[], topic: string | null, collection: string | null): VideoData[] {
  return videos.filter(video => (!topic || getVideoTopics(video).includes(topic))
    && (!collection || getVideoCollections(video).includes(collection)));
}
