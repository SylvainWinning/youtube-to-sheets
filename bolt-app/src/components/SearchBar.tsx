import React from 'react';
import { XCircle, Mic, Search } from 'lucide-react';
import { SearchFilters } from '../types/search';

type SearchField = SearchFilters['fields'][number];

const SEARCH_FIELDS: SearchField[] = ['title', 'channel', 'category'];

const SEARCH_FIELD_LABELS: Record<SearchField, string> = {
  title: 'Titre',
  channel: 'Chaîne',
  category: 'Catégorie',
};

interface SearchBarProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
}

export function SearchBar({ filters, onFiltersChange }: SearchBarProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const recognitionRef = React.useRef<any>(null);
  const [isListening, setIsListening] = React.useState(false);

  const [isBackdropEnabled, setIsBackdropEnabled] = React.useState(true);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const userAgent = window.navigator.userAgent;
    const isIOSDevice = /iP(ad|hone|od)/.test(userAgent);
    const isSafariBrowser = /Safari/.test(userAgent) && !/CriOS|FxiOS|OPiOS/.test(userAgent);

    if (isIOSDevice && isSafariBrowser) {
      setIsBackdropEnabled(false);
    }
  }, []);

  const handleClear = () => {
    onFiltersChange({ ...filters, query: '' });
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inputRef.current?.blur();
  };

  const handleFieldToggle = (field: SearchField) => {
    const isSelected = filters.fields.includes(field);

    if (isSelected) {
      if (filters.fields.length === 1) {
        return;
      }
      onFiltersChange({
        ...filters,
        fields: filters.fields.filter(existingField => existingField !== field),
      });
      return;
    }

    onFiltersChange({
      ...filters,
      fields: [...filters.fields, field],
    });
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
    return () => {
      stopListening();
    };
  }, []);

  return (
    <div className="mb-8">
      <div className="relative max-w-[640px] mx-auto flex items-center gap-4">
        <div className="relative flex-1 group">
          {/* Calque visuel séparé et désactivation du blur sur Safari iOS pour éviter le décalage du curseur */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 rounded-full transition-all duration-200 ${
              isBackdropEnabled
                ? 'backdrop-blur-md bg-white/30 dark:bg-neutral-600/30'
                : 'bg-white/60 dark:bg-neutral-700/60'
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
                type="search"
                placeholder="Rechercher"
                value={filters.query}
                onChange={(e) => onFiltersChange({ ...filters, query: e.target.value })}
                aria-label="Rechercher des vidéos"
                autoComplete="off"
                inputMode="search"
                className="w-full pl-4 pr-10 h-10 rounded-l-full bg-transparent text-youtube-black dark:text-white placeholder-youtube-gray-dark dark:placeholder-gray-400 text-sm focus:outline-none"
              />
              {filters.query && (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="Effacer la recherche"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-600 text-youtube-gray-dark dark:text-gray-400 hover:text-youtube-black dark:hover:text-white transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              aria-label="Lancer la recherche"
              className="h-10 px-6 bg-youtube-button dark:bg-neutral-700 hover:bg-youtube-button-hover dark:hover:bg-neutral-600 text-youtube-black dark:text-white rounded-r-full border-l-[1.5px] border-youtube-border dark:border-neutral-600 transition-all duration-200 focus:outline-none group-focus-within:border-youtube-red"
            >
              <Search className="w-5 h-5" />
            </button>
          </form>
        </div>
        {/* Voice search button retains its existing styling */}
        <button
          onClick={isListening ? stopListening : startListening}
          aria-label={isListening ? 'Arrêter la recherche vocale' : 'Activer la recherche vocale'}
          aria-pressed={isListening}
          className={`w-10 h-10 rounded-full transition-all duration-200 flex items-center justify-center border-[1.5px] border-transparent ${
            isListening
              ? 'bg-youtube-red text-white shadow-[0_0_10px_rgba(255,0,0,0.3)] border-youtube-red'
              : 'bg-youtube-button dark:bg-neutral-700 hover:bg-youtube-button-hover dark:hover:bg-neutral-600 hover:border-youtube-red hover:shadow-[0_0_10px_rgba(255,0,0,0.3)] text-youtube-black dark:text-white'
          }`}
        >
          <Mic className="w-5 h-5" />
        </button>
      </div>
      <div
        className="max-w-[640px] mx-auto mt-4 flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Limiter la recherche aux champs sélectionnés"
      >
        {SEARCH_FIELDS.map(field => {
          const isSelected = filters.fields.includes(field);
          const isDisabled = isSelected && filters.fields.length === 1;

          return (
            <label
              key={field}
              className={`flex items-center rounded-full border px-3 py-1 text-xs sm:text-sm font-medium transition-all ${
                isSelected
                  ? 'bg-youtube-button dark:bg-neutral-700 border-youtube-border dark:border-neutral-500 text-youtube-black dark:text-white shadow-[0_0_8px_rgba(255,0,0,0.15)]'
                  : 'bg-white/60 dark:bg-neutral-800/40 border-white/40 dark:border-neutral-600 text-youtube-gray-dark dark:text-gray-300 hover:bg-white/80 dark:hover:bg-neutral-700/60'
              } ${isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={isSelected}
                onChange={() => handleFieldToggle(field)}
                disabled={isDisabled}
              />
              {SEARCH_FIELD_LABELS[field]}
            </label>
          );
        })}
      </div>
    </div>
  );
}
