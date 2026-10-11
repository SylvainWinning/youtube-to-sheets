import { useCallback, useEffect, useState } from 'react';
import { readThemePreference, writePreference, THEME_KEY, type ThemePreference } from '../utils/preferences';

export function useTheme() {
  const [preference, setPreference] = useState(readThemePreference);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const theme = preference === 'auto' ? (systemDark ? 'dark' : 'light') : preference;
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const change = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    const storage = (event: StorageEvent) => {
      if (event.key === THEME_KEY || event.key === null) setPreference(readThemePreference());
    };
    media.addEventListener('change', change);
    window.addEventListener('storage', storage);
    return () => {
      media.removeEventListener('change', change);
      window.removeEventListener('storage', storage);
    };
  }, []);
  const setThemePreference = useCallback((value: ThemePreference) => {
    setPreference(value);
    writePreference(THEME_KEY, value);
  }, []);
  return { theme, preference, setThemePreference };
}
