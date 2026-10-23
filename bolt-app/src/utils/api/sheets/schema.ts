import { validateRow } from './validation.ts';
import { parseDate } from '../../timeUtils.ts';
import { getVideoIdentity } from '../../videoLibrary.ts';
import type { VideoData } from '../../../types/video.ts';
import type { SyncMetadata } from './types.ts';

export const VIDEO_SCHEMA_VERSION = 1;
export const VIDEO_COLUMNS = ['channelAvatar', 'title', 'link', 'channel', 'publishedAt', 'duration', 'views', 'likes', 'comments', 'shortDescription', 'tags', 'category', 'thumbnail', 'myCategory', 'playlistPosition', 'playlistId', 'channelId'] as const;
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function readTable(value: unknown): unknown[][] {
  if (!Array.isArray(value) || !value.every(Array.isArray)) throw new Error('Format tabulaire des vidéos invalide');
  return value;
}
export function isVideoHeader(row: readonly unknown[]): boolean {
  return row.length >= 13 && row.length <= VIDEO_COLUMNS.length && row.every((cell, index) => cell === VIDEO_COLUMNS[index]);
}
export function readVideoSnapshot(value: unknown): { rows: unknown[][]; metadata: unknown } {
  const envelope = isRecord(value) ? value : null;
  if (envelope?.schemaVersion !== undefined && envelope.schemaVersion !== VIDEO_SCHEMA_VERSION) {
    throw new Error('Version de la copie locale non prise en charge');
  }
  const table = readTable(envelope ? envelope.videos : value);
  if (envelope?.schemaVersion === VIDEO_SCHEMA_VERSION && (!table[0] || !isVideoHeader(table[0]))) {
    throw new Error('Colonnes de la copie locale incompatibles avec la version 1');
  }
  const hasHeader = envelope?.schemaVersion === VIDEO_SCHEMA_VERSION || !validateRow(table[0]);
  return { rows: hasHeader ? table.slice(1) : table, metadata: envelope?.metadata };
}
export function readSheetValues(value: unknown): unknown[][] {
  if (!isRecord(value) || 'error' in value || (value.majorDimension !== undefined && value.majorDimension !== 'ROWS')) {
    throw new Error('Réponse Google Sheets invalide');
  }
  return value.values === undefined ? [] : readTable(value.values);
}
export function readSyncMetadata(value: unknown, videos: VideoData[]): SyncMetadata | undefined {
  if (!isRecord(value)) return;
  const status = value.status, source = value.source;
  if (status !== 'complete' && status !== 'degraded' && status !== 'unknown') return;
  if (source !== 'youtube' && source !== 'mixed' && source !== 'cache' && source !== 'sheets') return;
  if (typeof value.videoCount !== 'number' || !Number.isSafeInteger(value.videoCount) || value.videoCount !== new Set(videos.map(getVideoIdentity)).size) return;
  if (value.privateVideoCount !== undefined && (typeof value.privateVideoCount !== 'number' || !Number.isSafeInteger(value.privateVideoCount) || value.privateVideoCount < 0)) return;
  const lastSuccessfulSync = value.lastSuccessfulSync;
  if (lastSuccessfulSync != null && (typeof lastSuccessfulSync !== 'string' || !parseDate(lastSuccessfulSync))) return;
  if (status === 'complete' && typeof lastSuccessfulSync !== 'string') return;
  return {
    status, source, videoCount: value.videoCount,
    ...(typeof lastSuccessfulSync === 'string' || lastSuccessfulSync === null ? { lastSuccessfulSync } : {}),
    ...(typeof value.privateVideoCount === 'number' ? { privateVideoCount: value.privateVideoCount } : {}),
    ...(typeof value.lastAttempt === 'string' && parseDate(value.lastAttempt) ? { lastAttempt: value.lastAttempt } : {}),
  };
}
