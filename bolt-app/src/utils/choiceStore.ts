import { CHOICE_STORAGE_KEY, readChoicePreferences, type ChoicePreferences } from './videoChoice.ts';

type ChoiceStorage = Pick<Storage, 'getItem' | 'setItem'>;
interface ChoiceSnapshot { preferences: ChoicePreferences; storageError: boolean }

/** One shared snapshot prevents cards and the chooser overwriting each other's changes. */
export function createChoiceStore(getStorage: () => ChoiceStorage, listen?: (refresh: () => void) => () => void) {
  let snapshot: ChoiceSnapshot | undefined;
  let stopListening: (() => void) | undefined;
  const listeners = new Set<() => void>();
  function read() {
    try { return readChoicePreferences(getStorage()); }
    catch { return { watched: [], excludeWatched: false }; }
  }
  function getSnapshot(): ChoiceSnapshot {
    return snapshot ??= { preferences: read(), storageError: false };
  }
  function notify() { listeners.forEach(listener => listener()); }
  function refresh() {
    const preferences = read();
    if (JSON.stringify(preferences) !== JSON.stringify(getSnapshot().preferences)) {
      snapshot = { preferences, storageError: false };
      notify();
    }
  }
  function update(change: (current: ChoicePreferences) => ChoicePreferences) {
    const preferences = change(getSnapshot().preferences);
    let storageError = false;
    try { getStorage().setItem(CHOICE_STORAGE_KEY, JSON.stringify(preferences)); }
    catch { storageError = true; }
    snapshot = { preferences, storageError };
    notify();
  }
  return {
    getSnapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) {
        if (!getSnapshot().storageError) refresh();
        stopListening = listen?.(refresh);
      }
      return () => {
        listeners.delete(listener);
        if (!listeners.size) { stopListening?.(); stopListening = undefined; }
      };
    },
    setWatched(id: string, watched: boolean) {
      update(current => ({ ...current, watched: watched ? [...new Set([...current.watched, id])] : current.watched.filter(value => value !== id) }));
    },
    setExcludeWatched(excludeWatched: boolean) { update(current => ({ ...current, excludeWatched })); },
  };
}
