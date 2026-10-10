import { useLayoutEffect, useRef, useState } from 'react';
import { VideoCard } from './VideoCard';
import { VideoData } from '../types/video';

interface VideoGridProps {
  videos: VideoData[];
}

export function VideoGrid({ videos }: VideoGridProps) {
  const batchSize = 40;
  const [page, setPage] = useState({ videos, count: batchSize });
  const gridRef = useRef<HTMLDivElement>(null);
  const nextFocusIndex = useRef<number | null>(null);

  // New filter results start at one batch. Unrelated app updates preserve
  // the memoized array, mounted cards, focus and the reading position.
  if (page.videos !== videos) {
    nextFocusIndex.current = null;
    setPage({ videos, count: batchSize });
  }

  const visibleCount = Math.min(page.videos === videos ? page.count : batchSize, videos.length);
  const remainingCount = videos.length - visibleCount;

  useLayoutEffect(() => {
    if (nextFocusIndex.current !== null) {
      const card = gridRef.current?.children[nextFocusIndex.current] as HTMLElement | undefined;
      card?.focus({ preventScroll: true });
      nextFocusIndex.current = null;
    }
  }, [visibleCount]);

  return (
    <section aria-label="Bibliothèque de vidéos" style={{ overflowAnchor: 'none' }}>
      <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-4 gap-y-8">
        {videos.slice(0, visibleCount).map((video, index) => (
          <VideoCard
            key={`${video.playlistId ?? 'playlist'}-${video.playlistPosition ?? index}-${video.link}`}
            video={video}
          />
        ))}
      </div>
      <div className="flex flex-col items-center gap-3 py-6">
        <p role="status" aria-live="polite" aria-atomic="true" className="text-sm text-youtube-gray-dark dark:text-gray-300">
          {visibleCount} vidéos affichées sur {videos.length}
        </p>
        {remainingCount > 0 && (
          <button
            type="button"
            className="neu-button rounded-xl px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-youtube-red"
            onClick={() => {
              nextFocusIndex.current = visibleCount;
              setPage(current => ({ ...current, count: current.count + batchSize }));
            }}
          >
            Afficher {Math.min(batchSize, remainingCount)} vidéos supplémentaires
          </button>
        )}
      </div>
    </section>
  );
}
