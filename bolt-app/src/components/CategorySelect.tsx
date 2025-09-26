import React from 'react';
import { List } from 'lucide-react';
import type { VideoData } from '../types/video';
import { getUniqueCategories } from '../utils/getUniqueCategories';
import { DropdownMenu } from './ui/DropdownMenu';
import { DropdownItem } from './ui/DropdownItem';

/**
 * CategorySelect provides a dropdown button that lists all unique
 * categories found in the provided video dataset. Selecting a category
 * will invoke the `onCategoryChange` callback with the chosen value.
 * A reset option is included to clear any filter and show all videos.
 */
interface CategorySelectProps {
  /** Array of video objects from which to derive categories */
  videos: VideoData[];
  /** Currently selected category; `null` means no filter */
  selectedCategory: string | null;
  /** Called when the selected category changes */
  onCategoryChange: (category: string | null) => void;
  /** Optional additional class names applied to the button */
  className?: string;
  /** Controls whether the menu opens above or below the trigger */
  menuPlacement?: 'top' | 'bottom';
}

export function CategorySelect({
  videos,
  selectedCategory,
  onCategoryChange,
  className = '',
  menuPlacement = 'bottom',
}: CategorySelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Compute unique categories alphabetically once per `videos` change
  const categories = React.useMemo(() => getUniqueCategories(videos), [videos]);

  // Don't render a button if there are no categories to choose from
  if (categories.length === 0) return null;

  // Determine the button label: show selected category or generic label
  const label = selectedCategory ?? 'Catégories';

  return (
    <DropdownMenu
      icon={<List className="w-5 h-5" />}
      label={label}
      isOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
      className={className}
      placement={menuPlacement}
    >
      {/* Option to clear the category filter */}
      <DropdownItem
        onClick={() => {
          onCategoryChange(null);
          setIsOpen(false);
        }}
        isSelected={selectedCategory === null}
      >
        Toutes les catégories
      </DropdownItem>
      {/* Render each category as its own item */}
      {categories.map((category) => (
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
