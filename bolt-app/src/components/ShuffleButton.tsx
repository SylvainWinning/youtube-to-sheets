import React from 'react';
import { Shuffle } from 'lucide-react';

interface ShuffleButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function ShuffleButton({ onClick, disabled }: ShuffleButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-2 rounded-r-lg transition-all duration-200 flex items-center justify-center bg-neu-base dark:bg-neutral-700/50 ${
        disabled
          ? 'text-gray-400 cursor-not-allowed shadow-neu-pressed dark:shadow-neu-pressed-dark'
          : 'text-gray-700 dark:text-gray-100 shadow-neu-flat dark:shadow-neu-flat-dark hover:shadow-neu-concave dark:hover:shadow-neu-concave-dark active:shadow-neu-pressed dark:active:shadow-neu-pressed-dark hover:text-youtube-red dark:hover:text-youtube-red'
      }`}
      title="Lecture aléatoire"
    >
      <Shuffle className="w-4 h-4" />
    </button>
  );
}
