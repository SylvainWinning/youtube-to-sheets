import React from 'react';
import { ArrowUpDown, ChevronDown } from 'lucide-react';
import { SortOptions, SORT_OPTIONS } from '../../types/sort';
import { getOptionValue, getSelectedLabel } from '../../utils/sort/utils';
import { SORT_LABELS } from '../../utils/sort/labels';
import { SortOption } from './SortOption';
import { useClickOutside } from '../../hooks/useClickOutside';

interface SortSelectProps {
  options: SortOptions | null;
  onOptionsChange: (options: SortOptions | null) => void;
}

export function SortSelect({ options, onOptionsChange }: SortSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false));

  // Log pour vérifier les props reçues
  React.useEffect(() => {
    console.log('SortSelect - Current options:', options);
  }, [options]);

  const handleSelect = (value: string) => {
    console.log('SortSelect - handleSelect called with value:', value);
    
    if (!value) {
      console.log('SortSelect - Resetting sort options to null');
      onOptionsChange(null);
    } else {
      const [field, direction] = value.split('_');
      const newOptions = { field, direction } as SortOptions;
      console.log('SortSelect - Setting new options:', newOptions);
      onOptionsChange(newOptions);
    }
    setIsOpen(false);
  };

  const selectedValue = getOptionValue(options);
  console.log('SortSelect - Selected value:', selectedValue);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="neu-button px-3 sm:px-4 py-2 rounded-xl flex items-center gap-2 w-full group"
      >
        <span className="text-gray-500 group-hover:text-youtube-red transition-colors shrink-0">
          <ArrowUpDown className="w-5 h-5" />
        </span>
        <span className="text-sm text-gray-700 dark:text-gray-200 truncate flex-1 text-left">
          {getSelectedLabel(options)}
        </span>
        <ChevronDown 
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 shrink-0 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="fixed sm:absolute z-50 mt-2 w-[calc(100vw-2rem)] sm:w-[280px] left-0 right-0 sm:left-0 sm:right-auto mx-4 sm:mx-0">
          <div className="overflow-hidden rounded-xl neu-card bg-white dark:bg-neutral-800">
            <div className="py-2">
              {[SORT_OPTIONS.PUBLISHED_DESC, SORT_OPTIONS.PUBLISHED_ASC].map((option) => (
                <SortOption
                  key={getOptionValue(option)}
                  option={option}
                  label={SORT_LABELS[getOptionValue(option)]}
                  selectedValue={selectedValue}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
