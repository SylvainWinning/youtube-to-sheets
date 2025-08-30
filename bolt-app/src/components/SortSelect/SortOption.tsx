import React from 'react';
import { SortOptions } from '../../types/sort';
import { getOptionValue } from '../../utils/sort/utils';

interface SortOptionProps {
  option: SortOptions;
  label: string;
  selectedValue: string;
  onSelect: (value: string) => void;
}

export function SortOption({ option, label, selectedValue, onSelect }: SortOptionProps) {
  const value = getOptionValue(option);
  
  const handleClick = () => {
    console.log('SortOption - Clicked:', {
      value,
      label,
      isSelected: selectedValue === value
    });
    onSelect(value);
  };
  
  return (
    <button
      onClick={handleClick}
      className={`w-full px-4 py-2.5 text-sm text-left transition-all duration-200
        ${selectedValue === value 
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium' 
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700'
        }
      `}
    >
      {label}
    </button>
  );
}
