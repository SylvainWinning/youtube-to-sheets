import { Volume2, VolumeX } from 'lucide-react';
import { useSound } from '../../hooks/useSound';

export function SoundToggle() {
  const { toggleAudio, playClick, isEnabled } = useSound();

  const handleToggle = () => {
    const newState = toggleAudio();
    if (newState) {
      playClick();
    }
  };

  return (
    <button
      type="button"
      aria-pressed={isEnabled}
      aria-label={isEnabled ? 'Désactiver le son' : 'Activer le son'}
      onClick={handleToggle}
      className={`
        p-2 rounded-full transition-all duration-200
        ${isEnabled
          ? 'text-youtube-red-accessible dark:text-youtube-red-accessible-dark hover:bg-youtube-red/10'
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
