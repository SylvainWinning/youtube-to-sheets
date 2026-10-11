import { useState, useCallback, useRef, useEffect } from 'react';
import { fetchAllVideos } from '../utils/api/videos.ts';
import { emptyVideoLoadState, resolveVideoLoad } from '../utils/videoLoadState.ts';

export function useVideos() {
  const [state, setState] = useState(emptyVideoLoadState);
  const latest = useRef(emptyVideoLoadState);
  const request = useRef(0);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const [isLoading, setIsLoading] = useState(true);

  const loadVideos = useCallback(async () => {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    const id = ++request.current;
    setIsLoading(true);
    try {
      const response = await fetchAllVideos(active.signal);
      if (id !== request.current || active.signal.aborted) return;
      latest.current = resolveVideoLoad(response, latest.current, navigator.onLine);
    } catch {
      if (id !== request.current || active.signal.aborted) return;
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
