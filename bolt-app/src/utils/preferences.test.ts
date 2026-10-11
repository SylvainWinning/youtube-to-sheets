import test from 'node:test';
import assert from 'node:assert/strict';
import { readPreference, writePreference, readThemePreference, THEME_KEY } from './preferences.ts';
test('le stockage indisponible conserve Auto et ne bloque pas les contrôles', () => {
  assert.equal(readPreference(THEME_KEY), null);
  assert.equal(readThemePreference(), 'auto');
  assert.doesNotThrow(() => writePreference(THEME_KEY, 'dark'));
});
test('seuls les choix de thème reconnus sont restaurés', () => {
  const values = new Map<string, string>();
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } } });
  try {
    for (const value of ['light', 'dark', 'auto', 'invalid']) {
      writePreference(THEME_KEY, value);
      assert.equal(readThemePreference(), value === 'light' || value === 'dark' ? value : 'auto');
    }
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
