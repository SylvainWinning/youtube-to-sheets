export const LIBRARY_HISTORY_KEY = 'youtubeLibraryProgress';
export const LIBRARY_BATCH_SIZE = 40;

export interface LibraryProgress {
  key: string;
  count: number;
  scrollY: number;
  focusIndex: number | null;
}

export function readLibraryProgress(state: unknown, key: string, total: number): LibraryProgress | null {
  const saved = (state as Record<string, unknown> | null)?.[LIBRARY_HISTORY_KEY] as Partial<LibraryProgress> | undefined;
  if (!saved || saved.key !== key || !Number.isInteger(saved.count) || saved.count! < 1 ||
      typeof saved.scrollY !== 'number' || !Number.isFinite(saved.scrollY) || saved.scrollY < 0) return null;
  const count = Math.min(saved.count!, total);
  const focusIndex = Number.isInteger(saved.focusIndex) && saved.focusIndex! >= 0 && saved.focusIndex! < count
    ? saved.focusIndex! : null;
  return { key, count, scrollY: saved.scrollY, focusIndex };
}

export function clearLibraryProgress() {
  const state = { ...window.history.state };
  delete state[LIBRARY_HISTORY_KEY];
  window.history.replaceState(state, '');
}
