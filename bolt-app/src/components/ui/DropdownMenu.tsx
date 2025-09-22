import React from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';

interface DropdownMenuProps {
  icon: React.ReactNode;
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

export function DropdownMenu({
  icon,
  label,
  isOpen,
  onToggle,
  children,
  className = ''
}: DropdownMenuProps) {
  const menuContentRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = useClickOutside<HTMLDivElement>(
    () => isOpen && onToggle(),
    [menuContentRef, triggerRef],
  );
  const [menuPosition, setMenuPosition] = React.useState({
    top: 0,
    left: 0,
    width: 0,
  });

  const animationFrameRef = React.useRef<number | null>(null);
  const [portalContainer, setPortalContainer] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    setPortalContainer(document.body);
  }, []);

  const updateMenuPosition = React.useCallback(() => {
    if (!isOpen || !triggerRef.current) return;
    if (typeof window === 'undefined') return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewport = window.visualViewport;
    const viewportWidth = viewport?.width ?? window.innerWidth;
    const viewportOffsetLeft = viewport?.offsetLeft ?? 0;
    const viewportOffsetTop = viewport?.offsetTop ?? 0;
    const spacing = 8; // équivalent Tailwind de mt-2
    const isSmallScreen = viewportWidth < 640; // breakpoint Tailwind "sm"
    const horizontalMargin = 16; // correspond à mx-4
    const availableWidth = Math.max(viewportWidth - horizontalMargin * 2, 0);

    const desiredWidth = isSmallScreen
      ? Math.max(availableWidth, triggerRect.width)
      : Math.min(280, Math.max(availableWidth, triggerRect.width));

    const width = desiredWidth > 0 ? desiredWidth : triggerRect.width;

    let left = isSmallScreen
      ? viewportOffsetLeft + horizontalMargin
      : viewportOffsetLeft + triggerRect.left;
    const minLeft = viewportOffsetLeft + horizontalMargin;
    const maxLeft = viewportOffsetLeft + viewportWidth - horizontalMargin - width;
    if (maxLeft < minLeft) {
      left = minLeft;
    } else {
      left = Math.min(Math.max(left, minLeft), maxLeft);
    }

    const top = triggerRect.bottom + spacing + viewportOffsetTop;

    setMenuPosition((prev) => {
      if (
        Math.abs(prev.top - top) < 0.5 &&
        Math.abs(prev.left - left) < 0.5 &&
        Math.abs(prev.width - width) < 0.5
      ) {
        return prev;
      }

      return { top, left, width };
    });
  }, [isOpen]);

  const scheduleMenuPositionUpdate = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    if (animationFrameRef.current !== null) return;

    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = null;
      updateMenuPosition();
    });
  }, [animationFrameRef, updateMenuPosition]);

  React.useLayoutEffect(() => {
    updateMenuPosition();
  }, [isOpen, updateMenuPosition]);

  React.useEffect(() => {
    if (!isOpen) return;

    scheduleMenuPositionUpdate();

    const handleResize = () => scheduleMenuPositionUpdate();
    const handleScroll = () => scheduleMenuPositionUpdate();
    const viewport = typeof window !== 'undefined' ? window.visualViewport : null;

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    viewport?.addEventListener('resize', handleResize);
    viewport?.addEventListener('scroll', handleResize);

    return () => {
      if (animationFrameRef.current !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      viewport?.removeEventListener('resize', handleResize);
      viewport?.removeEventListener('scroll', handleResize);
    };
  }, [isOpen, scheduleMenuPositionUpdate, animationFrameRef]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={triggerRef}
        onClick={onToggle}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`neu-button px-3 sm:px-4 py-2 rounded-xl flex items-center gap-2 w-full group ${className}`}
      >
        <span className="text-gray-500 group-hover:text-youtube-red transition-colors shrink-0">
          {icon}
        </span>
        <span className="text-sm text-gray-700 dark:text-gray-200 truncate flex-1 text-left">
          {label}
        </span>
        <ChevronDown 
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 shrink-0 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {portalContainer && isOpen &&
        createPortal(
          <div
            ref={menuContentRef}
            className="fixed z-50"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width || undefined,
            }}
          >
            <div className="overflow-hidden rounded-xl neu-card bg-white dark:bg-neutral-800">
              <div className="py-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {children}
              </div>
            </div>
          </div>,
          portalContainer,
        )}
    </div>
  );
}
