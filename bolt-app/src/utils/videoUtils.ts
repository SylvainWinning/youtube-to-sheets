import { LIBRARY_SAVE_EVENT } from './libraryProgress.ts';

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

export function saveVideoNavigation() {
  window.dispatchEvent(new Event(LIBRARY_SAVE_EVENT));
}
