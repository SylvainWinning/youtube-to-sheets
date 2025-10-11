import React from 'react';
import type { SortOptions } from '../types/sort';
import type { VideoData } from '../types/video';
import { SortSelect } from './SortSelect';
import { CategorySelect } from './CategorySelect';
import { getUniqueCategories } from '../utils/getUniqueCategories';

interface MobileFilterBarProps {
  videos: VideoData[];
  sortOptions: SortOptions | null;
  onSortOptionsChange: (options: SortOptions | null) => void;
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

export function MobileFilterBar({
  videos,
  sortOptions,
  onSortOptionsChange,
  selectedCategory,
  onCategoryChange,
}: MobileFilterBarProps) {
  const hasCategories = React.useMemo(
    () => getUniqueCategories(videos).length > 0,
    [videos],
  );

  const [keyboardOffset, setKeyboardOffset] = React.useState(0);
  const baseViewportOffsetRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) {
      return;
    }

    const viewport = window.visualViewport;
    let raf = 0;

    const computeViewportOffset = () => {
      const windowHeight = window.innerHeight;
      const { height, offsetTop } = viewport;
      return Math.max(windowHeight - height - offsetTop, 0);
    };

    const updateOffset = () => {
      if (raf) {
        cancelAnimationFrame(raf);
      }

      raf = window.requestAnimationFrame(() => {
        const rawOffset = computeViewportOffset();
        const baseOffset = baseViewportOffsetRef.current;

        if (baseOffset === null || rawOffset < baseOffset - 1) {
          baseViewportOffsetRef.current = rawOffset;
        }

        const resolvedBaseOffset = baseViewportOffsetRef.current ?? 0;
        const keyboardHeight = rawOffset - resolvedBaseOffset;
        const nextOffset = keyboardHeight > 1 ? keyboardHeight : 0;

        setKeyboardOffset(prev => (Math.abs(prev - nextOffset) < 1 ? prev : nextOffset));
      });
    };

    baseViewportOffsetRef.current = computeViewportOffset();
    updateOffset();
    viewport.addEventListener('resize', updateOffset);
    viewport.addEventListener('scroll', updateOffset);

    return () => {
      if (raf) {
        cancelAnimationFrame(raf);
      }
      viewport.removeEventListener('resize', updateOffset);
      viewport.removeEventListener('scroll', updateOffset);
    };
  }, []);

  const containerStyle = React.useMemo(
    () => ({ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }),
    [],
  );

  return (
    <div
      className="sm:hidden fixed inset-x-0 bottom-0 z-50"
      style={{ transform: `translateY(-${keyboardOffset}px)`, willChange: 'transform' }}
    >
      <div
        className="border-t border-gray-200/80 dark:border-neutral-700/80 bg-white/95 dark:bg-neutral-900/95 backdrop-blur shadow-[0_-12px_30px_rgba(15,15,15,0.18)] px-4 pt-3"
        style={containerStyle}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
            Filtres rapides
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200/80 to-transparent dark:via-neutral-700/80" />
        </div>
        <div
          className={`grid gap-3 ${hasCategories ? 'grid-cols-2' : 'grid-cols-1'}`}
        >
          <SortSelect
            options={sortOptions}
            onOptionsChange={onSortOptionsChange}
            className="bg-white/70 dark:bg-neutral-800/70"
          />
          {hasCategories && (
            <CategorySelect
              videos={videos}
              selectedCategory={selectedCategory}
              onCategoryChange={onCategoryChange}
              className="bg-white/70 dark:bg-neutral-800/70"
            />
          )}
        </div>
      </div>
    </div>
  );
}
