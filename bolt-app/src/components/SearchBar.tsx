import React from 'react';
import { XCircle, Mic, Search } from 'lucide-react';
import { SearchFilters } from '../types/search';
import { startSpeechSession, unsupportedVoice } from '../utils/speechSession';
import type { VoiceState } from '../utils/speechSession';

interface SearchBarProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
}

export function SearchBar({ filters, onFiltersChange }: SearchBarProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const cancelRef = React.useRef<(() => void) | null>(null);
  const latestRef = React.useRef({ filters, onFiltersChange });
  latestRef.current = { filters, onFiltersChange };
  const [supported] = React.useState(() => typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
  const [voice, setVoice] = React.useState<VoiceState>({ active: false, message: '' });
  const voiceStatusId = React.useId();
  const stopListening = () => {
    cancelRef.current?.();
    cancelRef.current = null;
    setVoice({ active: false, message: 'Dictée arrêtée. Vous pouvez utiliser le clavier.' });
  };
  const [isIOSDevice, setIsIOSDevice] = React.useState(false);

  const handleClear = () => {
    if (voice.active) stopListening();
    onFiltersChange({ ...filters, query: '' });
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inputRef.current?.blur();
  };

  const startListening = () => {
    cancelRef.current?.();
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { setVoice({ active: false, message: unsupportedVoice }); return; }
    cancelRef.current = startSpeechSession(Recognition, setVoice, transcript => {
      const current = latestRef.current;
      current.onFiltersChange({ ...current.filters, query: transcript });
      inputRef.current?.focus();
    });
  };

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const { userAgent, platform, maxTouchPoints } = window.navigator;
      const isIOS =
        /iPad|iPhone|iPod/.test(userAgent) ||
        (platform === 'MacIntel' && maxTouchPoints > 1);
      setIsIOSDevice(isIOS);
    }

    return () => {
      cancelRef.current?.();
    };
  }, []);

  return (
    <div className="mb-2 sm:mb-6">
      <div className="relative max-w-[640px] mx-auto flex items-center gap-4">
        <div className="relative flex-1 min-w-0 group">
          {/* Calque visuel séparé pour éviter le décalage du curseur iOS quand backdrop-filter est appliqué au formulaire */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 rounded-full transition-colors duration-200 ${
              isIOSDevice
                ? 'bg-white/70 dark:bg-neutral-700/60'
                : 'backdrop-blur-md bg-white/30 dark:bg-neutral-600/30'
            }`}
          />
          {/* Form container with Liquid Glass styling */}
          <form
            onSubmit={handleSubmit}
            className="relative z-[1] flex-1 flex items-center border-[1.5px] border-youtube-border dark:border-neutral-600 rounded-full transition-all duration-200 focus-within:border-youtube-red focus-within:ring-1 focus-within:ring-youtube-red/50 focus-within:shadow-[0_0_10px_rgba(255,0,0,0.3)]"
          >
            <div className="relative flex-1 min-w-0">
              <input
                ref={inputRef}
                type="text"
                placeholder="Rechercher"
                aria-label="Rechercher des vidéos"
                value={filters.query}
                onChange={(e) => { if (voice.active) stopListening(); onFiltersChange({ ...filters, query: e.target.value }); }}
                className="w-full pl-4 pr-10 h-10 rounded-l-full bg-transparent text-youtube-black dark:text-white placeholder-youtube-gray-dark dark:placeholder-gray-400 text-[16px] sm:text-sm focus:outline-hidden"
              />
              {filters.query && (
                <button
                  type="button"
                  aria-label="Effacer la recherche"
                  onClick={handleClear}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-600 text-youtube-gray-dark dark:text-gray-400 hover:text-youtube-black dark:hover:text-white transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              aria-label="Rechercher"
              className="h-10 px-6 bg-youtube-button dark:bg-neutral-700 hover:bg-youtube-button-hover dark:hover:bg-neutral-600 text-youtube-black dark:text-white rounded-r-full border-l-[1.5px] border-youtube-border dark:border-neutral-600 transition-all duration-200 focus:outline-hidden group-focus-within:border-youtube-red"
            >
              <Search className="w-5 h-5" />
            </button>
          </form>
        </div>
        {/* Voice search button retains its existing styling */}
        <button
          type="button"
          aria-label={voice.active ? 'Arrêter la recherche vocale' : 'Rechercher avec la voix'}
          aria-pressed={voice.active}
          disabled={!supported}
          aria-describedby={voiceStatusId}
          onClick={voice.active ? stopListening : startListening}
          className={`disabled:opacity-50 disabled:cursor-not-allowed shrink-0 w-10 h-10 rounded-full transition-all duration-200 flex items-center justify-center border-[1.5px] border-transparent ${
            voice.active
              ? 'bg-youtube-red text-white shadow-[0_0_10px_rgba(255,0,0,0.3)] border-youtube-red'
              : 'bg-youtube-button dark:bg-neutral-700 hover:bg-youtube-button-hover dark:hover:bg-neutral-600 hover:border-youtube-red hover:shadow-[0_0_10px_rgba(255,0,0,0.3)] text-youtube-black dark:text-white'
          }`}
        >
          <Mic className="w-5 h-5" />
        </button>
      </div>
      <p id={voiceStatusId} role="status" aria-live="polite" aria-atomic="true" className="max-w-[640px] mx-auto mt-2 text-sm text-youtube-gray-dark dark:text-gray-300">
        {supported ? voice.message : unsupportedVoice}
      </p>
    </div>
  );
}
