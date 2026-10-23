import type { VideoData } from '../types/video.ts';
import { getVideoIdentity, uniqueVideoCandidates } from './videoLibrary.ts';

export const CHOICE_STORAGE_KEY = 'youtube.video-choice.v1';
export interface ChoicePreferences { watched: string[]; excludeWatched: boolean }

export function readChoicePreferences(storage: Pick<Storage, 'getItem'>): ChoicePreferences {
  try {
    const value = JSON.parse(storage.getItem(CHOICE_STORAGE_KEY) ?? 'null');
    if (value && Array.isArray(value.watched) && value.watched.every((id: unknown) => typeof id === 'string')
      && typeof value.excludeWatched === 'boolean') {
      return { watched: [...new Set<string>(value.watched)], excludeWatched: value.excludeWatched };
    }
  } catch { /* Storage unavailable or damaged: drawing remains usable. */ }
  return { watched: [], excludeWatched: false };
}

/** Input is already filtered by the library; each unique video gets one chance. */
export function choiceCandidates(videos: VideoData[], preferences: ChoicePreferences): VideoData[] {
  const watched = new Set(preferences.watched);
  return uniqueVideoCandidates(videos).filter(video => !preferences.excludeWatched || !watched.has(getVideoIdentity(video)));
}

export function drawVideo(candidates: VideoData[], previous: string | null, random = Math.random): VideoData | null {
  const alternatives = candidates.filter(video => getVideoIdentity(video) !== previous);
  return alternatives.length ? alternatives[Math.floor(random() * alternatives.length)] : null;
}
