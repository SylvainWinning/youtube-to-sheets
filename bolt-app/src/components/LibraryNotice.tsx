import type { VideoLoadState } from '../utils/videoLoadState';

interface LibraryNoticeProps {
  state: VideoLoadState;
  isLoading: boolean;
  onRetry: () => void;
}

export function LibraryNotice({ state, isLoading, onRetry }: LibraryNoticeProps) {
  if (!state.warning) return null;
  const date = (value: number) => new Date(value).toLocaleString('fr-FR');
  return (
    <section aria-label="État de la bibliothèque" className="mb-4 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 px-4 py-3 text-amber-950 dark:text-amber-100">
      <div role="status" aria-live="polite">
        <p>{state.warning}</p>
        <p className="mt-1 text-sm">
          {state.source === 'local'
            ? state.publishedAt
              ? <>Copie locale publiée le <time dateTime={new Date(state.publishedAt).toISOString()}>{date(state.publishedAt)}</time>. </>
              : <>Date de publication de la copie locale inconnue. </>
            : null}
          {state.loadedAt !== null && <>Dernier chargement réussi le <time dateTime={new Date(state.loadedAt).toISOString()}>{date(state.loadedAt)}</time>.</>}
        </p>
      </div>
      <button type="button" disabled={isLoading} onClick={onRetry} className="mt-2 rounded-lg border border-amber-700 dark:border-amber-300 px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60">
        {isLoading ? 'Actualisation en cours…' : 'Réessayer l’actualisation'}
      </button>
    </section>
  );
}
