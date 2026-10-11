import { useState, useCallback, useRef } from 'react';
import { fetchAllVideos } from '../utils/api/sheets/index.ts';
import { emptyVideoLoadState, resolveVideoLoad } from '../utils/videoLoadState.ts';

export function useVideos() {
  const [state, setState] = useState(emptyVideoLoadState);
  const latest = useRef(emptyVideoLoadState);
  const request = useRef(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadVideos = useCallback(async () => {
    const id = ++request.current;
    setIsLoading(true);
    try {
      const response = await fetchAllVideos();
      if (id !== request.current) return;
      latest.current = resolveVideoLoad(response, latest.current, navigator.onLine);
    } catch {
      if (id !== request.current) return;
      latest.current = resolveVideoLoad({ data: [], error: 'Chargement interrompu' }, latest.current, navigator.onLine);
    } finally {
      if (id === request.current) {
        setState(latest.current);
        setIsLoading(false);
      }
    }
  }, []);

  return { ...state, isLoading, loadVideos };
}
