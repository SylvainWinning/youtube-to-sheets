import React from 'react';
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
  const menuRef = useClickOutside<HTMLDivElement>(() => isOpen && onToggle());
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = React.useState({
    top: 0,
    left: 0,
    width: 0,
  });

  const animationFrameRef = React.useRef<number | null>(null);

  const updateMenuPosition = React.useCallback(() => {
    if (!isOpen || !triggerRef.current) return;
    if (typeof window === 'undefined') return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const spacing = 8; // équivalent Tailwind de mt-2
    const viewportWidth = window.innerWidth;
    const isSmallScreen = viewportWidth < 640; // breakpoint Tailwind "sm"
    const horizontalMargin = 16; // correspond à mx-4
    const availableWidth = Math.max(viewportWidth - horizontalMargin * 2, 0);

    const desiredWidth = isSmallScreen
      ? Math.max(availableWidth, triggerRect.width)
      : Math.min(280, Math.max(availableWidth, triggerRect.width));

    const width = desiredWidth > 0 ? desiredWidth : triggerRect.width;

    let left = isSmallScreen ? horizontalMargin : triggerRect.left;
    const maxLeft = viewportWidth - horizontalMargin - width;
    if (maxLeft < horizontalMargin) {
      left = horizontalMargin;
    } else {
      left = Math.min(Math.max(left, horizontalMargin), maxLeft);
    }

    const top = triggerRect.bottom + spacing;

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

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      if (animationFrameRef.current !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, scheduleMenuPositionUpdate, animationFrameRef]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={triggerRef}
        onClick={onToggle}
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

      {isOpen && (
        <div
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
        </div>
      )}
    </div>
  );
}
