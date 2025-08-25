import { useCallback } from 'react';
import { audioManager } from '../utils/audio/AudioManager';
import { SOUNDS } from '../utils/audio/constants';

export function useSound() {
  const playClick = useCallback(async () => {
    await audioManager.play('CLICK');
  }, []);

  const playHover = useCallback(async () => {
    await audioManager.play('HOVER');
  }, []);

  return {
    playClick,
    playHover,
    toggleAudio: audioManager.toggle.bind(audioManager),
    isAudioEnabled: audioManager.isAudioEnabled.bind(audioManager)
  };
}