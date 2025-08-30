import type { VideoData } from '../../../types/video.ts';

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateRow(row: any[]): boolean {
  if (!Array.isArray(row)) {
    console.warn('Row validation failed: Not an array');
    return false;
  }

  const title = String(row[1] || '').trim();
  const link = String(row[2] || '').trim();
  const channelAvatar = String(row[0] || '').trim(); // Validate channel avatar from column A
  const thumbnail = String(row[12] || '').trim(); // Validate thumbnail from column M

  const hasTitleAndLink = title !== '' && link !== '';
  const hasValidLinkFormat = link.startsWith('http://') ||
                            link.startsWith('https://') ||
                            link.startsWith('www.');
  const hasValidAvatar = channelAvatar === '' || isValidHttpUrl(channelAvatar);
  const hasValidThumbnail = thumbnail === '' || isValidHttpUrl(thumbnail);

  if (!hasValidAvatar && channelAvatar) {
    console.warn('Invalid channel avatar URL:', {
      channelAvatar,
      rowIndex: row[0] ? `Row with title ${row[1]}` : 'Unknown row'
    });
  }

  if (!hasValidThumbnail && thumbnail) {
    console.warn('Invalid thumbnail URL:', {
      thumbnail,
      rowIndex: row[0] ? `Row with title ${row[1]}` : 'Unknown row'
    });
  }

  const isValid = hasTitleAndLink && hasValidLinkFormat && hasValidThumbnail && hasValidAvatar;

  if (!isValid) {
    console.warn('Row validation failed:', {
      hasTitleAndLink,
      hasValidLinkFormat,
      hasValidAvatar,
      hasValidThumbnail,
      title,
      link,
      channelAvatar,
      thumbnail,
      reason: !hasTitleAndLink ? 'Missing title or link' : 'Invalid link format'
    });
  }

  return isValid;
}

export function validateVideoData(video: VideoData): boolean {
  return (
    typeof video.title === 'string' &&
    video.title.trim().length > 0 &&
    typeof video.link === 'string' &&
    video.link.trim().length > 0
  );
}
