import { ArrowUp } from 'lucide-react';

export function ReturnToTop({ onReturn }: { onReturn: () => void }) {
  return <button type="button" aria-label="Retour en haut" title="Retour en haut"
    onClick={onReturn}
    className="neu-button shrink-0 rounded-lg min-h-11 w-11 flex items-center justify-center text-gray-700 dark:text-gray-100">
    <ArrowUp aria-hidden="true" className="w-4 h-4" />
  </button>;
}
