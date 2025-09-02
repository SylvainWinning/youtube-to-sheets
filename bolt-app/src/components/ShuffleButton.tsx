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
      className={`p-2 rounded-r-lg transition-all duration-200 backdrop-blur-md bg-white/30 dark:bg-neutral-600/30 border border-white/40 dark:border-neutral-500/40 ${
        disabled
          ? 'text-gray-400 cursor-not-allowed shadow-neu-pressed'
          : 'text-gray-700 dark:text-gray-200 hover:text-blue-600'
      }`}
      title="Lecture aléatoire"
    >
      <Shuffle className="w-4 h-4" />
    </button>
  );
}
