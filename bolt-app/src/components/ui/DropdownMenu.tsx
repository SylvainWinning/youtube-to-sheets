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

  const updatePlacement = React.useCallback(() => {
    if (!triggerRef.current || !dropdownRef.current) {
      return;
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuHeight = dropdownRef.current.offsetHeight;
    const gap = 16; // garder une marge avec le bouton et le bas de l'écran
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;

    if (spaceAbove >= menuHeight + gap || spaceAbove >= spaceBelow) {
      setPlacement('top');
    } else {
      setPlacement('bottom');
    }
  }, []);

  React.useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePlacement();
    window.addEventListener('resize', updatePlacement);

    return () => {
      window.removeEventListener('resize', updatePlacement);
    };
  }, [isOpen, updatePlacement]);

  const positionClasses =
    placement === 'top'
      ? 'bottom-full mb-4'
      : 'top-full mt-4';

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
          className={`absolute left-0 right-0 z-50 ${positionClasses}`}
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
