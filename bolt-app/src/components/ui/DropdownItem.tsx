import React from 'react';

interface DropdownItemProps {
  onClick: () => void;
  isSelected?: boolean;
  children: React.ReactNode;
}

export function DropdownItem({ onClick, isSelected, children }: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-2.5 text-sm text-left transition-all duration-200
        ${isSelected 
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' 
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700'
        }
      `}
    >
      {children}
    </button>
  );
}