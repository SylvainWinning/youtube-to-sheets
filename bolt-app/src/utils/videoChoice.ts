import type { VideoData } from '../types/video.ts';
import { getVideoIdentity } from './videoLibrary.ts';

export function drawVideo(candidates: VideoData[], previous: string | null, random = Math.random): VideoData | null {
  const alternatives = candidates.filter(video => getVideoIdentity(video) !== previous);
  return alternatives.length ? alternatives[Math.floor(random() * alternatives.length)] : null;
}
