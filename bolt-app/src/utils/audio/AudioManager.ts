import { SOUNDS } from './constants';

class AudioManager {
  private static instance: AudioManager;
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private isEnabled = true;
  private loaded = false;
  private loadPromise: Promise<void> | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.loadPromise = this.preloadSounds();
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
    
    // Wait for initial load if still loading
    if (this.loadPromise) {
      await this.loadPromise;
      this.loadPromise = null;
    }
    
    if (!this.loaded) return; // Skip if loading failed
    
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
    return this.isEnabled;
  }

  public isAudioEnabled() {
    return this.isEnabled;
  }
}

export const audioManager = AudioManager.getInstance();
