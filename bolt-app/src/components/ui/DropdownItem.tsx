import React from 'react';
import { CheckCircle } from 'lucide-react';

interface DropdownItemProps {
  onClick: () => void;
  isSelected?: boolean;
  children: React.ReactNode;
}

export function DropdownItem({ onClick, isSelected, children }: DropdownItemProps) {
  return (
    <button
      type="button"
      aria-pressed={Boolean(isSelected)}
      onClick={onClick}
      className={`w-full px-4 py-2.5 text-sm text-left transition-all duration-200
        ${isSelected
          ? 'bg-red-50 dark:bg-red-950/50 text-youtube-red-accessible dark:text-youtube-red-accessible-dark font-semibold'
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700'
        }
      `}
    >
      {isSelected && (
        <CheckCircle aria-hidden="true" className="w-4 h-4 mr-2 inline-block align-middle" />
      )}
      <span className="align-middle">{children}</span>
    </button>
  );
}
