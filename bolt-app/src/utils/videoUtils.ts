import { LIBRARY_SAVE_EVENT } from './libraryProgress.ts';
import type { VideoData } from '../types/video.ts';
import type { SheetTab } from '../types/sheets.ts';
import { filterVideosByDuration } from './videoFilters.ts';
import { uniqueVideoCandidates } from './videoLibrary.ts';

/** Only recognized YouTube video links can be opened from library data. */
export function getYouTubeUrl(link: string): string | null {
  try {
    const url = new URL(link);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const hosts = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'];
    if (!hosts.includes(url.hostname)) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    const id = url.hostname === 'youtu.be' ? parts[0]
      : url.pathname === '/watch' ? url.searchParams.get('v')
      : ['shorts', 'embed', 'live'].includes(parts[0]) ? parts[1] : null;
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
    return `https://www.youtube.com/watch?v=${id}`;
  } catch { return null; }
}

export function generateYouTubeThumbnail(link: string): string {
  const url = getYouTubeUrl(link);
  return url ? `https://img.youtube.com/vi/${new URL(url).searchParams.get('v')}/maxresdefault.jpg` : '';
}

export function saveVideoNavigation() {
  window.dispatchEvent(new Event(LIBRARY_SAVE_EVENT));
}

export function getRandomVideo(videos: VideoData[], tab: SheetTab | null, random = Math.random): VideoData | null {
  const candidates = uniqueVideoCandidates(videos);
  const filteredVideos = tab ? filterVideosByDuration(candidates, tab) : candidates;
  if (filteredVideos.length === 0) return null;
  
  const randomIndex = Math.floor(random() * filteredVideos.length);
  return filteredVideos[randomIndex];
}

/** Shuffle has no fixed destination until clicked. Cards use native anchors. */
export function playVideo(video: VideoData | null) {
  const url = video && getYouTubeUrl(video.link);
  if (!url) return;
  saveVideoNavigation();
  window.open(url, '_blank', 'noopener,noreferrer');
}
