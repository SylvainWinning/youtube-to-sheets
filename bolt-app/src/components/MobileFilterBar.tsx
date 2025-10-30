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
  const [isTextInputFocused, setIsTextInputFocused] = React.useState(false);
  const keyboardVisibleRef = React.useRef(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = React.useState(false);
  const previousRawOffsetRef = React.useRef<number | null>(null);
  const keyboardCloseFrameCountRef = React.useRef(0);
  const baseViewportMetricsRef = React.useRef<{
    offset: number;
    height: number;
  } | null>(null);

  const setKeyboardVisibility = React.useCallback((visible: boolean) => {
    if (keyboardVisibleRef.current !== visible) {
      keyboardVisibleRef.current = visible;
      setIsKeyboardVisible(visible);
      return;
    }

    keyboardVisibleRef.current = visible;
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const isTextInputElement = (element: EventTarget | null): element is HTMLElement => {
      if (!(element instanceof HTMLElement)) {
        return false;
      }

      const tagName = element.tagName;
      return (
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        element.isContentEditable === true
      );
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (isTextInputElement(event.target)) {
        setIsTextInputFocused(true);
      }
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (!isTextInputElement(event.target)) {
        return;
      }

      window.requestAnimationFrame(() => {
        const activeElement = document.activeElement;
        if (!isTextInputElement(activeElement)) {
          setIsTextInputFocused(false);
          setKeyboardOffset(0);
          setKeyboardVisibility(false);
          baseViewportMetricsRef.current = null;
          previousRawOffsetRef.current = null;
        }
      });
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, [setKeyboardVisibility]);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) {
      return;
    }

    const viewport = window.visualViewport;
    let raf = 0;

    const computeViewportOffset = (): number => {
      const windowHeight = window.innerHeight;
      const { height, offsetTop } = viewport;
      return Math.max(windowHeight - height + Math.min(offsetTop, 0), 0);
    };

    const setBaseViewportMetrics = (offset: number) => {
      baseViewportMetricsRef.current = {
        offset,
        height: viewport.height,
      };
    };

    const updateOffset = () => {
      if (raf) {
        cancelAnimationFrame(raf);
      }

      raf = window.requestAnimationFrame(() => {
        const rawOffset = computeViewportOffset();
        const previousRawOffset = previousRawOffsetRef.current;
        previousRawOffsetRef.current = rawOffset;
        const shouldTrackKeyboard =
          isTextInputFocused || keyboardVisibleRef.current;

        if (!shouldTrackKeyboard) {
          setBaseViewportMetrics(rawOffset);
          setKeyboardOffset(0);
          keyboardCloseFrameCountRef.current = 0;
          return;
        }
        const baseMetrics = baseViewportMetricsRef.current;

        if (
          baseMetrics === null ||
          rawOffset < baseMetrics.offset - 1 ||
          viewport.height >= baseMetrics.height - 1
        ) {
          setBaseViewportMetrics(rawOffset);
        }

        const resolvedBaseMetrics = baseViewportMetricsRef.current;
        const resolvedBaseOffset = resolvedBaseMetrics?.offset ?? 0;
        const baseHeight = resolvedBaseMetrics?.height ?? viewport.height;
        const keyboardHeight = Math.max(rawOffset - resolvedBaseOffset, 0);
        const heightDifference = Math.max(baseHeight - viewport.height, 0);
        const viewportShift = Math.max(keyboardHeight, heightDifference);
        const keyboardOpenThreshold = 140;
        const keyboardCloseThreshold = 80;
        const keyboardCloseFramesRequired = 3;
        if (viewportShift < keyboardCloseThreshold) {
          keyboardCloseFrameCountRef.current += 1;
        } else {
          keyboardCloseFrameCountRef.current = 0;
        }
        const rawOffsetDecrease =
          previousRawOffset !== null ? previousRawOffset - rawOffset : 0;
        const keyboardHeightClosing =
          viewportShift < keyboardCloseThreshold &&
          keyboardCloseFrameCountRef.current >= keyboardCloseFramesRequired;
        const rawOffsetClosing =
          rawOffsetDecrease > 4 &&
          rawOffset <= resolvedBaseOffset + keyboardCloseThreshold;

        if (viewportShift > keyboardOpenThreshold) {
          if (!keyboardVisibleRef.current) {
            setKeyboardVisibility(true);
          }

          keyboardCloseFrameCountRef.current = 0;
          const nextOffset = keyboardHeight;

          setKeyboardOffset(prev =>
            Math.abs(prev - nextOffset) < 1 ? prev : nextOffset,
          );
          return;
        }

        if (
          keyboardVisibleRef.current &&
          (keyboardHeightClosing || rawOffsetClosing)
        ) {
          setKeyboardVisibility(false);
          setKeyboardOffset(0);
          setBaseViewportMetrics(rawOffset);
          keyboardCloseFrameCountRef.current = 0;
          return;
        }

        if (!keyboardVisibleRef.current) {
          setBaseViewportMetrics(rawOffset);
          setKeyboardOffset(0);
        }
      });
    };

    setBaseViewportMetrics(computeViewportOffset());
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
  }, [isTextInputFocused, setKeyboardVisibility]);

  const containerStyle = React.useMemo(
    () => ({ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }),
    [],
  );

  const fixedContainerStyle = React.useMemo<React.CSSProperties>(
    () => ({
      bottom: isKeyboardVisible ? keyboardOffset : 0,
      willChange:
        isKeyboardVisible && keyboardOffset > 0 ? 'bottom' : undefined,
    }),
    [isKeyboardVisible, keyboardOffset],
  );

  return (
    <div
      className="sm:hidden fixed inset-x-0 bottom-0 z-50"
      style={fixedContainerStyle}
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
