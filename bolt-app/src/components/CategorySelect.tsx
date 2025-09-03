import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { VideoData } from '../types/video';
import { DropdownMenu } from './ui/DropdownMenu';
import { DropdownItem } from './ui/DropdownItem';

interface CategorySelectProps {
  videos: VideoData[];
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  className?: string;
}

export function CategorySelect({ videos, selectedCategory, onCategoryChange, className = '' }: CategorySelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  const categories = React.useMemo(() => {
    const uniqueCategories = new Set(
      videos
        .map(video => video.category)
        .filter(category => category && category.trim() !== '')
    );
    return Array.from(uniqueCategories).sort((a, b) =>
      sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a)
    );
  }, [videos, sortOrder]);

  if (categories.length === 0) return null;

  return (
    <DropdownMenu
      icon={<ArrowUpDown className="w-5 h-5 text-gray-500 group-hover:text-youtube-red transition-colors shrink-0" />}
      label={sortOrder === 'asc' ? 'Plus anciennes' : 'Plus récentes'}
      isOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
      className={className}
    >
      <DropdownItem onClick={() => setSortOrder('desc')}>Plus récentes</DropdownItem>
      <DropdownItem onClick={() => setSortOrder('asc')}>Plus anciennes</DropdownItem>
      {categories.map(category => (
        <DropdownItem
          key={category}
          onClick={() => {
            onCategoryChange(category);
            setIsOpen(false);
          }}
          isSelected={selectedCategory === category}
        >
          {category}
        </DropdownItem>
      ))}
    </DropdownMenu>
  );
}
