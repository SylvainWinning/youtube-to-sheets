import { VideoData } from '../types/video';
import { SheetTab } from '../types/sheets';
import { filterVideosByDuration } from './videoFilters';

function extractYouTubeId(url: string): string | null {
  try {
    // Gère les formats d'URL courants de YouTube
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    console.warn('Format d\'URL YouTube non reconnu:', url);
    return null;
  } catch (error) {
    console.error('Erreur lors de l\'extraction de l\'ID YouTube:', error);
    return null;
  }
}

export function generateYouTubeThumbnail(url: string): string {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    return ''; // URL de fallback ou vide si pas d'ID valide
  }

  // On utilise maxresdefault.jpg pour la meilleure qualité
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

export function getRandomVideo(videos: VideoData[], tab: SheetTab | null): VideoData | null {
  const filteredVideos = tab ? filterVideosByDuration(videos, tab) : videos;
  if (filteredVideos.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * filteredVideos.length);
  return filteredVideos[randomIndex];
}

export function playVideo(video: VideoData | null) {
  if (!video) return;

  // Essaye d'ouvrir directement l'application YouTube via son schéma d'URL.
  const videoId = extractYouTubeId(video.link);

  if (videoId) {
    const appUrl = `youtube://${videoId}`;
    const webUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Redirige vers l'app YouTube. Si elle n'est pas installée, la redirection
    // échoue et l'on ouvre l'URL web en repli après un court délai.
    window.location.href = appUrl;
    setTimeout(() => {
      window.open(webUrl, '_blank', 'noopener,noreferrer');
    }, 500);
    return;
  }

  // Si l'ID de la vidéo n'est pas détecté, on ouvre simplement le lien.
  window.open(video.link, '_blank', 'noopener,noreferrer');
}
