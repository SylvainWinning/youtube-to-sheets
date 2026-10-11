import { useTheme } from '../../hooks/useTheme';
import type { ThemePreference } from '../../utils/preferences';

export function ThemeToggle() {
  const { preference, setThemePreference } = useTheme();
  return (
    <select aria-label="Thème" value={preference}
      onChange={event => setThemePreference(event.target.value as ThemePreference)}
      className="min-h-10 rounded-xl border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 text-sm text-gray-700 dark:text-gray-100">
      <option value="auto">Auto</option>
      <option value="light">Clair</option>
      <option value="dark">Sombre</option>
    </select>
  );
}
