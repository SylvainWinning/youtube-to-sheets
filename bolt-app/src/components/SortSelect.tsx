import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { SortOptions, SORT_OPTIONS } from '../types/sort';
import { getOptionValue, getSelectedLabel } from '../utils/sort/utils';
import { SORT_LABELS } from '../utils/sort/labels';
import { DropdownMenu } from './ui/DropdownMenu';
import { DropdownItem } from './ui/DropdownItem';

interface SortSelectProps {
  options: SortOptions | null;
  onOptionsChange: (options: SortOptions | null) => void;
}

export function SortSelect({ options, onOptionsChange }: SortSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelect = (value: string) => {
    if (!value) {
      onOptionsChange(null);
    } else {
      const [field, direction] = value.split('_');
      onOptionsChange({ field, direction } as SortOptions);
    }
    setIsOpen(false);
  };

  return (
    <DropdownMenu
      icon={<ArrowUpDown className="w-5 h-5 text-gray-500 group-hover:text-youtube-red transition-colors shrink-0" />}
      label={getSelectedLabel(options)}
      isOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
  >      <div className="px-4 py-2">
        <div className="text-xs font-medium text-gray-500 uppercase">Date de publication</div>
      </div>

      {[SORT_OPTIONS.PUBLISHED_DESC, SORT_OPTIONS.PUBLISHED_ASC].map((option) => (
        <DropdownItem
          key={getOptionValue(option)}
          onClick={() => handleSelect(getOptionValue(option))}
          isSelected={getOptionValue(options) === getOptionValue(option)}
        >
          {SORT_LABELS[getOptionValue(option)]}
        </DropdownItem>
      ))}
    </DropdownMenu>
  );
}
