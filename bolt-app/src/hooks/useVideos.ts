import { useState, useCallback } from 'react';
import { VideoData } from '../types/video';
import { fetchAllVideos } from '../utils/api/sheets';

export function useVideos() {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVideos = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: apiError, metadata } = await fetchAllVideos();

      if (apiError) {
        const errorMessage = metadata?.errors?.length
          ? metadata.errors.join('\n')
          : apiError;
        setError(errorMessage);
        setVideos([]);
      } else {
        setVideos(data);

        if (metadata?.errors?.length) {
          setError(metadata.errors.join('\n'));
        } else if (data.length === 0) {
          setError('Aucune vidéo trouvée.');
        } else {
          setError(null);
        }
      }
    } catch (err) {
      setError('Une erreur inattendue est survenue. Veuillez réessayer.');
      setVideos([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    videos,
    isLoading,
    error,
    loadVideos
  };
}
