import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { type SortOptions } from '../types/sort';
import { getOptionValue, getSortMenu } from '../utils/sort/utils';
import { DropdownMenu } from './ui/DropdownMenu';
import { DropdownItem } from './ui/DropdownItem';

interface SortSelectProps {
  options: SortOptions | null;
  onOptionsChange: (options: SortOptions | null) => void;
  className?: string;
  searching?: boolean;
  playlistSelected?: boolean;
}

export function SortSelect({ options, onOptionsChange, className = '', searching = false, playlistSelected = false }: SortSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { selectedValue, choices } = getSortMenu(options, searching, playlistSelected);

  return (
    <DropdownMenu
      icon={<ArrowUpDown className="w-5 h-5 text-gray-500 group-hover:text-youtube-red-accessible dark:group-hover:text-youtube-red-accessible-dark transition-colors shrink-0" />}
      label={choices.find(choice => getOptionValue(choice.options) === selectedValue)?.label ?? 'Trier'}
      isOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
      className={className}
    >
      <div className="px-4 py-2">
        <div className="text-xs font-medium text-gray-500 uppercase">Trier les vidéos</div>
      </div>

      {choices.map(choice => (
        <DropdownItem
          key={getOptionValue(choice.options)}
          onClick={() => { onOptionsChange(choice.options); setIsOpen(false); }}
          isSelected={selectedValue === getOptionValue(choice.options)}
        >
          {choice.label}
        </DropdownItem>
      ))}
    </DropdownMenu>
  );
}
