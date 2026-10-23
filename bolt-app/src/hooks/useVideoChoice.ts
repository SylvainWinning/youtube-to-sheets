import { useSyncExternalStore } from 'react';
import { createChoiceStore } from '../utils/choiceStore';
import { CHOICE_STORAGE_KEY } from '../utils/videoChoice';

const store = createChoiceStore(() => window.localStorage, refresh => {
  const onStorage = (event: StorageEvent) => {
    if (event.key === CHOICE_STORAGE_KEY || event.key === null) refresh();
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
});

export function useVideoChoice() {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return { ...snapshot, setWatched: store.setWatched, setExcludeWatched: store.setExcludeWatched };
}
