import { useCallback, useSyncExternalStore } from 'react';
import { audioManager } from '../utils/audio/AudioManager';

export function useSound() {
  const isEnabled = useSyncExternalStore(audioManager.subscribe, audioManager.getSnapshot, () => true);
  const playClick = useCallback(async () => {
    await audioManager.play('CLICK');
  }, []);

  const playHover = useCallback(async () => {
    await audioManager.play('HOVER');
  }, []);

  return {
    isEnabled,
    playClick,
    playHover,
    toggleAudio: audioManager.toggle.bind(audioManager),
    isAudioEnabled: audioManager.isAudioEnabled.bind(audioManager)
  };
}
