import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useSound } from '../../hooks/useSound';

export function SoundToggle() {
  const [isEnabled, setIsEnabled] = React.useState(true);
  const { toggleAudio, playClick } = useSound();

  const handleToggle = () => {
    const newState = toggleAudio();
    setIsEnabled(newState);
    if (newState) {
      playClick();
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`
        p-2 rounded-full transition-all duration-200
        ${isEnabled 
          ? 'text-youtube-red hover:bg-youtube-red/10' 
          : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-700'
        }
      `}
      title={isEnabled ? 'Désactiver le son' : 'Activer le son'}
    >
      {isEnabled ? (
        <Volume2 className="w-5 h-5" />
      ) : (
        <VolumeX className="w-5 h-5" />
      )}
    </button>
  );
}