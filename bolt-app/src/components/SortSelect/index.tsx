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
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement | null>(null);
  const [placement, setPlacement] = React.useState<'top' | 'bottom'>('top');
  const playlistValue = getOptionValue(null);

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
  const playlistLabel = SORT_LABELS[playlistValue];

  const updatePlacement = React.useCallback(() => {
    if (!triggerRef.current || !dropdownRef.current) {
      return;
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuHeight = dropdownRef.current.offsetHeight;
    const gap = 16;
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

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={triggerRef}
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
        <div
          className={`absolute z-50 w-full sm:w-[280px] left-0 right-0 sm:right-auto ${
            placement === 'top' ? 'bottom-full mb-4' : 'top-full mt-4'
          }`}
          ref={dropdownRef}
        >
          <div className="overflow-hidden rounded-xl neu-card bg-white dark:bg-neutral-800">
            <div className="py-2">
              <button
                onClick={() => handleSelect(playlistValue)}
                className={`w-full px-4 py-2.5 text-sm text-left transition-all duration-200 ${
                  selectedValue === playlistValue
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700'
                }`}
              >
                {playlistLabel}
              </button>

              <div className="my-1 border-t border-gray-100 dark:border-neutral-700" />

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
