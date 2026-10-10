import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { VideoCard } from './VideoCard';
import { VideoData } from '../types/video';
import { LIBRARY_BATCH_SIZE, LIBRARY_HISTORY_KEY, readLibraryProgress } from '../utils/libraryProgress';

interface VideoGridProps {
  videos: VideoData[];
}

export function VideoGrid({ videos }: VideoGridProps) {
  const batchSize = LIBRARY_BATCH_SIZE;
  const resultKey = useMemo(() => JSON.stringify(videos.map(video =>
    [video.playlistId, video.playlistPosition, video.link])), [videos]);
  const [restored] = useState(() => readLibraryProgress(window.history.state, resultKey, videos.length));
  const [page, setPage] = useState({ videos, count: restored?.count ?? batchSize });
  const restorePending = useRef(restored);
  const gridRef = useRef<HTMLDivElement>(null);
  const nextFocusIndex = useRef<number | null>(null);

  // New filter results start at one batch. Unrelated app updates preserve
  // the memoized array, mounted cards, focus and the reading position.
  if (page.videos !== videos) {
    restorePending.current = null;
    nextFocusIndex.current = null;
    setPage({ videos, count: batchSize });
  }

  const visibleCount = Math.min(page.videos === videos ? page.count : batchSize, videos.length);
  const remainingCount = videos.length - visibleCount;

  useLayoutEffect(() => {
    if (restorePending.current) {
      const saved = restorePending.current;
      if (saved.focusIndex !== null) {
        (gridRef.current?.children[saved.focusIndex] as HTMLElement | undefined)?.focus({ preventScroll: true });
      }
      window.scrollTo({ top: saved.scrollY, behavior: 'instant' });
      restorePending.current = null;
    }
    if (nextFocusIndex.current !== null) {
      const card = gridRef.current?.children[nextFocusIndex.current] as HTMLElement | undefined;
      card?.focus({ preventScroll: true });
      nextFocusIndex.current = null;
    }
  }, [visibleCount]);

  useEffect(() => {
    // History state belongs to this browser entry, so Back and refresh can
    // recover even when the browser cannot keep the React tree in its cache.
    const saveProgress = () => {
      const focused = gridRef.current ? Array.from(gridRef.current.children).indexOf(document.activeElement!) : -1;
      window.history.replaceState({ ...window.history.state, [LIBRARY_HISTORY_KEY]: {
        key: resultKey, count: visibleCount, scrollY: window.scrollY, focusIndex: focused < 0 ? null : focused,
      } }, '');
    };
    saveProgress();
    window.addEventListener('pagehide', saveProgress);
    return () => window.removeEventListener('pagehide', saveProgress);
  }, [resultKey, visibleCount]);

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
          {visibleCount} vidéo{visibleCount === 1 ? '' : 's'} affichée{visibleCount === 1 ? '' : 's'} sur {videos.length}
        </p>
        {remainingCount > 0 && (
          <button
            type="button"
            className="neu-button rounded-xl px-4 py-3 text-gray-700 dark:text-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-youtube-red"
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
