import { SOUNDS } from './constants';
import { readPreference, writePreference, SOUND_KEY } from '../preferences';

class AudioManager {
  private static instance: AudioManager;
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private isEnabled = readPreference(SOUND_KEY) !== 'off';
  private listeners = new Set<() => void>();
  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  public getSnapshot = () => this.isEnabled;
  private loaded = false;
  private loadPromise: Promise<void> | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      if (this.isEnabled) this.loadPromise = this.preloadSounds();
      window.addEventListener('storage', event => {
        if (event.key === SOUND_KEY || event.key === null) {
          this.isEnabled = readPreference(SOUND_KEY) !== 'off';
          this.listeners.forEach(listener => listener());
        }
      });
    }
  }

  private async preloadSounds() {
    try {
      const loadPromises = Object.entries(SOUNDS).map(([key, url]) => {
        return new Promise<void>((resolve) => {
          const audio = new Audio();
          
          // Set properties before setting src to avoid race conditions
          audio.volume = 0.5;
          audio.preload = 'auto';
          
          // Use error event to handle failures gracefully
          audio.onerror = () => {
            console.warn(`Failed to load sound: ${key}`);
            resolve(); // Resolve anyway to not block other sounds
          };
          
          audio.oncanplaythrough = () => {
            this.sounds.set(key, audio);
            resolve();
          };

          // Set src last
          audio.src = url;
        });
      });

      await Promise.all(loadPromises);
      this.loaded = true;
      console.log('Sounds preloaded successfully');
    } catch (error) {
      console.warn('Sound preload failed, continuing without sound');
      this.loaded = false; // Mark as failed but continue
    }
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public async play(soundKey: keyof typeof SOUNDS) {
    if (!this.isEnabled) return;
    
    if (!this.loaded && !this.loadPromise) this.loadPromise = this.preloadSounds();
    // Wait for initial load if still loading
    if (this.loadPromise) {
      await this.loadPromise;
      this.loadPromise = null;
    }
    
    if (!this.loaded || !this.isEnabled) return; // Skip if loading failed
    
    const audio = this.sounds.get(soundKey);
    if (audio) {
      try {
        const sound = audio.cloneNode() as HTMLAudioElement;
        sound.volume = 0.5;
        await sound.play();
      } catch (error) {
        // Ignore play() failures - common with mobile browsers
        console.debug('Sound playback failed, continuing silently');
      }
    }
  }

  public toggle() {
    this.isEnabled = !this.isEnabled;
    writePreference(SOUND_KEY, this.isEnabled ? 'on' : 'off');
    this.listeners.forEach(listener => listener());
    return this.isEnabled;
  }

  public isAudioEnabled() {
    return this.isEnabled;
  }
}

export const audioManager = AudioManager.getInstance();
