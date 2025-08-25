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
      className={`
        p-2 rounded-r-lg transition-all duration-200
        ${disabled 
          ? 'text-gray-400 cursor-not-allowed shadow-neu-pressed' 
          : 'text-gray-600 hover:text-blue-600 neu-button'
        }
      `}
      title="Lecture aléatoire"
    >
      <Shuffle className="w-4 h-4" />
    </button>
  );
}