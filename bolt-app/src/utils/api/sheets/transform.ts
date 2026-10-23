import type { VideoData } from '../../../types/video.ts';
import { isVideoHeader } from './schema.ts';
import { parseDate } from '../../timeUtils.ts';
import { cellText, imageUrl, validateRow, videoUrl } from './validation.ts';

export function parsePlaylistPosition(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const position = Number(value);
  return Number.isSafeInteger(position) && position >= 0 ? position : null;
}

export function mapRowToVideo(row: readonly unknown[], index = 0): VideoData {
  const link = videoUrl(row[2]) ?? cellText(row[2]);
  const id = videoUrl(link) ? new URL(link).searchParams.get('v') : null;
  return {
    channelId: cellText(row[16]), channelAvatar: imageUrl(row[0]),
    title: cellText(row[1]), link, channel: cellText(row[3]),
    // Preserve valid legacy calendar semantics; never invent today's date.
    publishedAt: parseDate(cellText(row[4])) ? cellText(row[4]) : '',
    duration: cellText(row[5], '00:00'), views: cellText(row[6], '0'),
    likes: cellText(row[7], '0'), comments: cellText(row[8], '0'),
    shortDescription: cellText(row[9]), tags: cellText(row[10]),
    category: cellText(row[11], 'Non catégorisé'), myCategory: cellText(row[13]),
    thumbnail: imageUrl(row[12]) || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : ''),
    playlistPosition: parsePlaylistPosition(row[14]) ?? index,
    ...(cellText(row[15]) ? { playlistId: cellText(row[15]) } : {}),
  };
}

/** Both transports use the same validation, optional-field policy and original row indexes. */
export function transformVideoRows(rows: readonly unknown[][]): VideoData[] {
  const values = rows[0] && isVideoHeader(rows[0]) ? rows.slice(1) : rows;
  return values.flatMap((row, index) => validateRow(row) ? [mapRowToVideo(row, index)] : []);
}
