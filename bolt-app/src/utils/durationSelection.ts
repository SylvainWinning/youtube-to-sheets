import type { VideoData } from '../types/video.ts';
import { SHEET_TABS } from './constants.ts';
import { filterVideosByDuration } from './videoFilters.ts';

export const DURATION_LIMITS = [5, 10, 20, 30, 45, 60] as const;
export function isDurationLimit(value: number): boolean {
  return DURATION_LIMITS.some(limit => limit === value);
}
export function getDurationLabel(selection: number): string {
  if (selection < -1 && isDurationLimit(-selection)) return `Moins de ${-selection} min`;
  return SHEET_TABS[selection]?.name ?? 'Toutes durées';
}
export function filterByDurationSelection(videos: VideoData[], selection: number): VideoData[] {
  const tab = selection < -1 && isDurationLimit(-selection)
    ? { name: getDurationLabel(selection), range: '', durationRange: { min: 0, max: -selection } }
    : SHEET_TABS[selection];
  return tab ? filterVideosByDuration(videos, tab) : videos;
}
