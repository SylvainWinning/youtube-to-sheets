import type { VideoData } from '../types/video.ts';

// Définition des différents formats de liens YouTube pris en charge. Les
// expressions régulières capturent l'identifiant de la vidéo ou de la playlist
// afin de le réutiliser pour générer des miniatures fiables.
const URL_PATTERNS = {
  STANDARD: /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
  SHORTS: /youtube\.com\/shorts\/([^&\n?#]+)/,
  PLAYLIST: /youtube\.com\/playlist\?list=([^&\n?#]+)/
};

/**
 * Extrait l'identifiant d'une vidéo YouTube à partir de différents formats
 * d'URL. Retourne `null` si aucun identifiant n'est détecté.
 *
 * @param url L'URL YouTube à analyser (watch, youtu.be, embed, shorts…)
 */
export function extractYouTubeId(url: string): string | null {
  try {
    const cleanUrl = url.trim().toLowerCase();
    for (const [_key, pattern] of Object.entries(URL_PATTERNS)) {
      const match = cleanUrl.match(pattern);
      if (match && match[1]) {
        console.log('YouTube ID extracted:', {
          url: cleanUrl,
          id: match[1]
        });
        return match[1];
      }
    }
    console.warn('Unrecognized YouTube URL format:', url);
    return null;
  } catch (error) {
    console.error('Error extracting YouTube ID:', {
      url,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Génère l'URL de la miniature (hqdefault) pour une vidéo YouTube.
 * Retourne une chaîne vide si l'URL fournie est invalide ou ne contient
 * pas d'identifiant reconnaissable.
 *
 * @param url L'URL d'origine de la vidéo YouTube
 */
export function generateThumbnail(url: string): string {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    console.warn('Could not generate thumbnail - invalid YouTube URL:', url);
    return '';
  }
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Valide et enrichit un objet `VideoData` en corrigeant la miniature si
 * nécessaire. Si la miniature fournie n'existe pas ou ne provient pas des
 * domaines d'images YouTube officiels (`img.youtube.com` ou `ytimg.com`),
 * une nouvelle miniature est générée à partir du lien de la vidéo.
 *
 * @param video Les données vidéo à traiter
 */
export function processVideoData(video: VideoData): VideoData {
  // Vérifie si la miniature existe et pointe vers un domaine valide de YouTube
  const hasValidThumbnail =
    typeof video.thumbnail === 'string' &&
    /(img\.youtube\.com|ytimg\.com)/.test(video.thumbnail);

  if (!hasValidThumbnail) {
    const newThumbnail = generateThumbnail(video.link);
    if (newThumbnail) {
      console.log('Generated new thumbnail for video:', {
        title: video.title,
        oldThumbnail: video.thumbnail,
        newThumbnail
      });
      return { ...video, thumbnail: newThumbnail };
    }
  }
  // Aucune modification si la miniature est déjà considérée comme valide.
  return video;
}