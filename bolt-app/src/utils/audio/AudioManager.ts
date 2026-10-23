import { SOUNDS } from './constants.ts';
import { readPreference, writePreference, SOUND_KEY } from '../preferences.ts';

export class AudioManager {
  private static instance: AudioManager;
  private sounds = new Map<keyof typeof SOUNDS, HTMLAudioElement>();
  private isEnabled = readPreference(SOUND_KEY) !== 'off';
  private listeners = new Set<() => void>();
  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  public getSnapshot = () => this.isEnabled;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', event => {
        if (event.key === SOUND_KEY || event.key === null) {
          this.setEnabled(readPreference(SOUND_KEY) !== 'off');
        }
      });
    }
  }

  private setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      for (const audio of this.sounds.values()) {
        audio.muted = true;
        audio.pause();
        audio.currentTime = 0;
      }
    }
    this.listeners.forEach(listener => listener());
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) AudioManager.instance = new AudioManager();
    return AudioManager.instance;
  }

  public async play(soundKey: keyof typeof SOUNDS) {
    if (!this.isEnabled || typeof Audio === 'undefined') return;
    try {
      let audio = this.sounds.get(soundKey);
      if (!audio) {
        audio = new Audio();
        audio.preload = 'none';
        audio.volume = 0.5;
        audio.src = SOUNDS[soundKey];
        this.sounds.set(soundKey, audio);
      }
      audio.muted = false;
      audio.currentTime = 0;
      // Start within the user's gesture; never queue playback behind preloading.
      await audio.play();
    } catch {
      // A blocked player or unavailable sound must not prevent navigation.
    }
  }

  public toggle() {
    this.setEnabled(!this.isEnabled);
    writePreference(SOUND_KEY, this.isEnabled ? 'on' : 'off');
    return this.isEnabled;
  }

  public isAudioEnabled() { return this.isEnabled; }
}

export const audioManager = AudioManager.getInstance();
