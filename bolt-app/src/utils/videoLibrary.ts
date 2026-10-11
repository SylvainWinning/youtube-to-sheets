import type { LibraryVideo, PlaylistMembership, VideoData } from '../types/video.ts';

/** Identité YouTube insensible au format du lien, mais sensible à la casse de l’ID. */
export function getVideoIdentity(video: Pick<VideoData, 'link'>): string {
  const link = video.link.trim();
  try {
    const url = new URL(link.startsWith('www.') ? `https://${link}` : link);
    const host = url.hostname.toLowerCase();
    let id: string | null = null;
    if (host === 'youtu.be') id = url.pathname.split('/')[1];
    else if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtube-nocookie.com' || host.endsWith('.youtube-nocookie.com')) {
      if (url.pathname === '/watch') id = url.searchParams.get('v');
      else if (/^\/(shorts|embed|live)\//.test(url.pathname)) id = url.pathname.split('/')[2];
    }
    if (id && /^[A-Za-z0-9_-]{11}$/.test(id)) return `youtube:${id}`;
  } catch { /* Les anciens liens non standard restent distincts par URL. */ }
  return `url:${link}`;
}

export function getPlaylistMemberships(video: VideoData): PlaylistMembership[] {
  return video.playlistMemberships ?? [{ playlistId: video.playlistId, position: video.playlistPosition }];
}

/** Conserve la première fiche et toutes les appartenances/positions, sans modifier la source. */
export function buildVideoLibrary(entries: VideoData[]): LibraryVideo[] {
  const library = new Map<string, LibraryVideo>();
  for (const entry of entries) {
    const identity = getVideoIdentity(entry);
    let video = library.get(identity);
    if (!video) {
      const { playlistId: _playlistId, playlistPosition: _playlistPosition, ...metadata } = entry;
      video = { ...metadata, identity, playlistMemberships: [] };
      library.set(identity, video);
    }
    for (const membership of getPlaylistMemberships(entry)) {
      if (!video.playlistMemberships.some(existing => existing.playlistId === membership.playlistId && existing.position === membership.position)) {
        video.playlistMemberships.push({ ...membership });
      }
    }
  }
  return [...library.values()];
}

export function getPlaylistIds(videos: VideoData[]): string[] {
  return [...new Set(videos.flatMap(video => getPlaylistMemberships(video)
    .flatMap(membership => membership.playlistId ? [membership.playlistId] : [])))];
}

export function filterVideosByPlaylist(videos: VideoData[], playlistId: string | null): VideoData[] {
  return playlistId ? videos.filter(video => getPlaylistMemberships(video).some(membership => membership.playlistId === playlistId)) : videos;
}

export function getPlaylistPosition(video: VideoData, playlistId: string | null): number | undefined {
  const memberships = getPlaylistMemberships(video);
  if (!playlistId) return memberships[0]?.position;
  const positions = memberships.filter(membership => membership.playlistId === playlistId)
    .map(membership => Number(membership.position)).filter(Number.isFinite);
  return positions.length ? Math.min(...positions) : undefined;
}

/** Chaque vidéo a une chance, même si l’appelant fournit encore des lignes par playlist. */
export function uniqueVideoCandidates(videos: VideoData[]): VideoData[] {
  const seen = new Set<string>();
  return videos.filter(video => {
    const identity = getVideoIdentity(video);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}
