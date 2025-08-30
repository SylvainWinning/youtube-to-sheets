
// Supported YouTube URL patterns
const URL_PATTERNS = {
  STANDARD: /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/i,
  SHORTS: /youtube\.com\/shorts\/([^&\n?#]+)/i,
  PLAYLIST: /youtube\.com\/playlist\?list=([^&\n?#]+)/i
};

/**
 * Extracts YouTube video ID from various URL formats
 */
export function extractYouTubeId(url: string): string | null {
  try {
    // Clean the URL but preserve original case for video IDs
    const cleanUrl = url.trim();
    
    // Try each pattern
    for (const [format, pattern] of Object.entries(URL_PATTERNS)) {
      const match = cleanUrl.match(pattern);
      if (match && match[1]) {
        console.log(`YouTube ID extracted (${format}):`, {
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

