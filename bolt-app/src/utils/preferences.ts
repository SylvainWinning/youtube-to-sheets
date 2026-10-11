export type ThemePreference = 'auto' | 'light' | 'dark';
export const THEME_KEY = 'youtube.theme';
export const SOUND_KEY = 'youtube.sound';
export function readPreference(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
export function writePreference(key: string, value: string): void {
  try { window.localStorage.setItem(key, value); } catch { /* Keep controls usable without storage. */ }
}
export function readThemePreference(): ThemePreference {
  const value = readPreference(THEME_KEY);
  return value === 'light' || value === 'dark' ? value : 'auto';
}
