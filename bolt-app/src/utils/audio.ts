import { useState } from 'react';

// Soft click sound from mixkit.co (free to use)
const CLICK_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3';

class AudioPlayer {
  private static instance: AudioPlayer;
  private audio: HTMLAudioElement | null = null;
  private isLoaded = false;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio(CLICK_SOUND_URL);
      this.audio.volume = 0.8; // Increase volume to 80%
      
      // Preload the audio
      this.audio.addEventListener('canplaythrough', () => {
        this.isLoaded = true;
      });
    }
  }

  public static getInstance(): AudioPlayer {
    if (!AudioPlayer.instance) {
      AudioPlayer.instance = new AudioPlayer();
    }
    return AudioPlayer.instance;
  }

  public play() {
    if (this.audio && this.isLoaded) {
      // Reset the audio to start if it's already playing
      this.audio.currentTime = 0;
      this.audio.play().catch(error => {
        console.warn('Failed to play click sound:', error);
      });
    }
  }
}

export const audioPlayer = AudioPlayer.getInstance();
