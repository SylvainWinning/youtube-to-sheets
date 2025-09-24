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
  const rafRef = React.useRef<number>();
  const listenerOptions = React.useRef<{ capture: boolean; passive: boolean }>({
    capture: true,
    passive: true,
  });
  const menuContentRef = React.useRef<HTMLDivElement>(null);
  const lastPositionRef = React.useRef({
    top: Number.NaN,
    left: Number.NaN,
    width: Number.NaN,
  });

  const applyMenuPosition = React.useCallback(
    (nextPosition: { top: number; left: number; width: number }) => {
      const menuElement = menuContentRef.current;
      if (!menuElement) return;

      const { top, left, width } = nextPosition;
      const lastPosition = lastPositionRef.current;

      const hasTop = Number.isFinite(lastPosition.top);
      if (!hasTop || Math.abs(lastPosition.top - top) >= 0.5) {
        menuElement.style.top = `${top}px`;
      }

      const hasLeft = Number.isFinite(lastPosition.left);
      if (!hasLeft || Math.abs(lastPosition.left - left) >= 0.5) {
        menuElement.style.left = `${left}px`;
      }

      const hasWidth = Number.isFinite(lastPosition.width);
      if (!hasWidth || Math.abs(lastPosition.width - width) >= 0.5) {
        if (width > 0) {
          menuElement.style.width = `${width}px`;
        } else {
          menuElement.style.removeProperty('width');
        }
      }

      lastPositionRef.current = { top, left, width };
    },
    [],
  );

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

    applyMenuPosition({ top, left, width });
  }, [applyMenuPosition, isOpen]);

  React.useLayoutEffect(() => {
    updateMenuPosition();
  }, [isOpen, updateMenuPosition]);

  const scheduleUpdate = React.useCallback(() => {
    if (!isOpen) return;
    if (typeof window === 'undefined') return;

    if (rafRef.current !== undefined) {
      return;
    }

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = undefined;
      updateMenuPosition();
    });
  }, [isOpen, updateMenuPosition]);

  React.useEffect(() => {
    if (!isOpen) return;

    scheduleUpdate();

    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('scroll', scheduleUpdate, listenerOptions.current);

    return () => {
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate, listenerOptions.current);
      if (rafRef.current !== undefined && typeof window !== 'undefined') {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
    };
  }, [isOpen, scheduleUpdate]);

  React.useEffect(() => {
    if (!isOpen) {
      lastPositionRef.current = {
        top: Number.NaN,
        left: Number.NaN,
        width: Number.NaN,
      };
    }
  }, [isOpen]);

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
        <div ref={menuContentRef} className="fixed z-50">
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
