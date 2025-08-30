
// Définition des différents formats de liens YouTube pris en charge. Les
// expressions régulières capturent l'identifiant de la vidéo ou de la playlist
// afin de le réutiliser pour générer des miniatures fiables.
const URL_PATTERNS = {
  STANDARD: /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/i,
  SHORTS: /youtube\.com\/shorts\/([^&\n?#]+)/i,
  PLAYLIST: /youtube\.com\/playlist\?list=([^&\n?#]+)/i
};

/**
 * Extrait l'identifiant d'une vidéo YouTube à partir de différents formats
 * d'URL. Retourne `null` si aucun identifiant n'est détecté.
 *
 * @param url L'URL YouTube à analyser (watch, youtu.be, embed, shorts…)
 */
export function extractYouTubeId(url: string): string | null {
  try {
    const cleanUrl = url.trim();
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
