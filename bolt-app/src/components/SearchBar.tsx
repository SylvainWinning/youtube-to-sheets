// Résolution de conflit de merge
import React from 'react';
import { XCircle, Mic, Search } from 'lucide-react';
import { SearchFilters } from '../types/search';

interface SearchBarProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
}

export function SearchBar({ filters, onFiltersChange }: SearchBarProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const recognitionRef = React.useRef<any>(null);
  const [isListening, setIsListening] = React.useState(false);
  const [isIOSDevice, setIsIOSDevice] = React.useState(false);

  const handleClear = () => {
    onFiltersChange({ ...filters, query: '' });
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inputRef.current?.blur();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const startListening = async () => {
    try {
      stopListening();
      const Recognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new Recognition();
      recognitionRef.current = recognition;
      recognition.lang = 'fr-FR';
      recognition.continuous = false;
      recognition.interimResults = false;
      const maxListeningDuration = 10000;
      const timeoutId = setTimeout(stopListening, maxListeningDuration);
      recognition.onstart = () => {
        setIsListening(true);
      };
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onFiltersChange({ ...filters, query: transcript });
        inputRef.current?.focus();
        clearTimeout(timeoutId);
        stopListening();
      };
      recognition.onerror = (event: any) => {
        console.error('Erreur de reconnaissance vocale:', event.error);
        clearTimeout(timeoutId);
        stopListening();
      };
      recognition.onend = () => {
      clearTimeout(timeoutId);
        stopListening();
      };
      recognition.start();
    } catch (error) {
      console.error("La reconnaissance vocale n'est pas supportée:", error);
      stopListening();
    }
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
      stopListening();
    };
  }, []);

  return (
    <div className="mb-6">
      <div className="relative max-w-[640px] mx-auto flex items-center gap-4">
        <div className="relative flex-1 group">
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
            className="relative z-[1] flex-1 flex items-center border-[1.5px] border-youtube-border dark:border-neutral-600 rounded-full transition-all duration-200 focus-within:border-youtube-red focus-within:ring-1 focus-within:ring-youtube-red focus-within:ring-opacity-50 focus-within:shadow-[0_0_10px_rgba(255,0,0,0.3)]"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                placeholder="Rechercher"
                value={filters.query}
                onChange={(e) => onFiltersChange({ ...filters, query: e.target.value })}
                className="w-full pl-4 pr-10 h-10 rounded-l-full bg-transparent text-youtube-black dark:text-white placeholder-youtube-gray-dark dark:placeholder-gray-400 text-[16px] sm:text-sm focus:outline-none"
              />
              {filters.query && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-600 text-youtube-gray-dark dark:text-gray-400 hover:text-youtube-black dark:hover:text-white transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="h-10 px-6 bg-youtube-button dark:bg-neutral-700 hover:bg-youtube-button-hover dark:hover:bg-neutral-600 text-youtube-black dark:text-white rounded-r-full border-l-[1.5px] border-youtube-border dark:border-neutral-600 transition-all duration-200 focus:outline-none group-focus-within:border-youtube-red"
            >
              <Search className="w-5 h-5" />
            </button>
          </form>
        </div>
        {/* Voice search button retains its existing styling */}
        <button
          onClick={isListening ? stopListening : startListening}
          className={`w-10 h-10 rounded-full transition-all duration-200 flex items-center justify-center border-[1.5px] border-transparent ${
            isListening
              ? 'bg-youtube-red text-white shadow-[0_0_10px_rgba(255,0,0,0.3)] border-youtube-red'
              : 'bg-youtube-button dark:bg-neutral-700 hover:bg-youtube-button-hover dark:hover:bg-neutral-600 hover:border-youtube-red hover:shadow-[0_0_10px_rgba(255,0,0,0.3)] text-youtube-black dark:text-white'
          }`}
        >
          <Mic className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
