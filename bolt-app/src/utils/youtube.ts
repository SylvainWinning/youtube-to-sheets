import { VideoData } from '../types/video';

// Supported YouTube URL patterns
const URL_PATTERNS = {
  STANDARD: /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
  SHORTS: /youtube\.com\/shorts\/([^&\n?#]+)/,
  PLAYLIST: /youtube\.com\/playlist\?list=([^&\n?#]+)/
};

/**
 * Extracts YouTube video ID from various URL formats
 */
export function extractYouTubeId(url: string): string | null {
  try {
    // Clean and normalize the URL
    const cleanUrl = url.trim().toLowerCase();
    
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

/**
 * Generates thumbnail URL for a YouTube video
 * Uses hqdefault.jpg as it's more reliable than maxresdefault.jpg
 */
export function generateThumbnail(url: string): string {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    console.warn('Could not generate thumbnail - invalid YouTube URL:', url);
    return '';
  }
  
  // Use hqdefault.jpg for better reliability
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Validates and processes video data to ensure proper thumbnail URLs
 */
export function processVideoData(video: VideoData): VideoData {
  // Generate thumbnail if not provided or invalid
  if (!video.thumbnail || !video.thumbnail.includes('youtube.com')) {
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
  
  return video;
}