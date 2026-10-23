import { getYouTubeUrl } from '../../videoUtils.ts';

export function cellText(value: unknown, fallback = ''): string {
  return (typeof value === 'string' || typeof value === 'number') && String(value).trim() !== '' ? String(value).trim() : fallback;
}

export function imageUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

export function videoUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const link = value.trim();
  return getYouTubeUrl(link.startsWith('www.') ? `https://${link}` : link);
}

/** Optional metadata/images never determine whether a playable video survives. */
export function validateRow(row: unknown): row is unknown[] {
  return Array.isArray(row) && typeof row[1] === 'string' && row[1].trim() !== '' && videoUrl(row[2]) !== null;
}
