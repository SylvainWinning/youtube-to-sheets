import type { VideoData } from '../../../types/video.ts';

export function validateRow(row: any[]): boolean {
  if (!Array.isArray(row)) {
    console.warn('Row validation failed: Not an array');
    return false;
  }

  const title = String(row[1] || '').trim();
  const link = String(row[2] || '').trim();
  const thumbnail = String(row[0] || '').trim(); // Validate thumbnail from column A
  const channelAvatar = String(row[12] || '').trim(); // Validate channel avatar from column M

  const hasTitleAndLink = title !== '' && link !== '';
  const hasValidLinkFormat = link.startsWith('http://') ||
                            link.startsWith('https://') ||
                            link.startsWith('www.');
  const hasValidThumbnail = thumbnail.startsWith('http://') ||
                           thumbnail.startsWith('https://');
  const hasValidAvatar = channelAvatar === '' ||
                         channelAvatar.startsWith('http://') ||
                         channelAvatar.startsWith('https://');

  if (!hasValidThumbnail) {
    console.warn('Invalid thumbnail URL:', {
      thumbnail,
      rowIndex: row[0] ? `Row with title ${row[1]}` : 'Unknown row'
    });
  }

  if (!hasValidAvatar && channelAvatar) {
    console.warn('Invalid channel avatar URL:', {
      channelAvatar,
      rowIndex: row[0] ? `Row with title ${row[1]}` : 'Unknown row'
    });
  }

  const isValid = hasTitleAndLink && hasValidLinkFormat && hasValidThumbnail && hasValidAvatar;

  if (!isValid) {
    console.warn('Row validation failed:', {
      hasTitleAndLink,
      hasValidLinkFormat,
      hasValidThumbnail,
      hasValidAvatar,
      title,
      link,
      thumbnail,
      channelAvatar,
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