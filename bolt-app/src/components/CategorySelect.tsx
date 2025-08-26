import React from 'react';
import { VideoData } from '../types/video';
import { DropdownItem } from './ui/DropdownItem';

interface CategorySelectProps {
  videos: VideoData[];
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  className?: string;
}

export function CategorySelect({ videos, selectedCategory, onCategoryChange, className = '' }: CategorySelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const categories = React.useMemo(() => {
    const uniqueCategories = new Set(
      videos
        .map(video => video.category)
        .filter(category => category && category.trim() !== '')
    );
    return Array.from(uniqueCategories).sort();
  }, [videos]);

  if (categories.length === 0) return null;

  return (
    <div className={`relative ${className}`}>
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full">
          <div className="overflow-hidden rounded-xl neu-card bg-white dark:bg-neutral-800">
            <div className="py-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}