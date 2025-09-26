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
  className = '',
}: DropdownMenuProps) {
  const menuRef = useClickOutside<HTMLDivElement>(() => {
    if (isOpen) {
      onToggle();
    }
  });
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement | null>(null);
  const [placement, setPlacement] = React.useState<'top' | 'bottom'>('top');
  const [dropdownStyle, setDropdownStyle] = React.useState<React.CSSProperties>({});

  const updatePlacement = React.useCallback(() => {
    if (!triggerRef.current || !dropdownRef.current) {
      return;
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuHeight = dropdownRef.current.offsetHeight;
    const gap = 16; // garder une marge avec le bouton et le bas de l'écran
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;

    const shouldOpenUp = spaceAbove >= menuHeight + gap || spaceAbove >= spaceBelow;
    const nextPlacement = shouldOpenUp ? 'top' : 'bottom';

    setPlacement(nextPlacement);

    if (window.matchMedia('(max-width: 639px)').matches) {
      const horizontalMargin = 16;
      const style: React.CSSProperties = {
        left: horizontalMargin,
        right: horizontalMargin,
      };

      if (nextPlacement === 'top') {
        style.bottom = window.innerHeight - triggerRect.top + gap;
        style.top = 'auto';
      } else {
        style.top = triggerRect.bottom + gap;
        style.bottom = 'auto';
      }

      setDropdownStyle(style);
    } else {
      setDropdownStyle({});
    }
  }, []);

  React.useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);

    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [isOpen, updatePlacement]);

  const positionClasses =
    placement === 'top'
      ? 'sm:bottom-full sm:mb-4'
      : 'sm:top-full sm:mt-4';

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
          className={`fixed sm:absolute left-0 right-0 sm:left-0 sm:right-auto z-50 w-[calc(100vw-2rem)] sm:w-auto mx-4 sm:mx-0 ${positionClasses}`}
          style={dropdownStyle}
          ref={dropdownRef}
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
