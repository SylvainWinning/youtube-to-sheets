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
  containerClassName?: string;
}

export function DropdownMenu({
  icon,
  label,
  isOpen,
  onToggle,
  children,
  className = '',
  containerClassName = '',
}: DropdownMenuProps) {
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuId = React.useId();
  const menuRef = useClickOutside<HTMLDivElement>(() => {
    if (isOpen) {
      onToggle();
    }
  });

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onToggle();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onToggle]);

  return (
    <div className={`relative min-w-0 ${containerClassName}`} ref={menuRef}>
      <button
        type="button"
        ref={triggerRef}
        id={`${menuId}-trigger`}
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
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
        <div id={menuId} role="group" aria-labelledby={`${menuId}-trigger`} className="absolute left-0 right-0 bottom-full mb-2 z-50 sm:top-full sm:bottom-auto sm:mb-0 sm:mt-2">
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
