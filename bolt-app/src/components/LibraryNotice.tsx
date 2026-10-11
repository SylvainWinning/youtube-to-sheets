import type { VideoLoadState } from '../utils/videoLoadState';

interface LibraryNoticeProps {
  state: VideoLoadState;
  isLoading: boolean;
  onRetry: () => void;
}

export function LibraryNotice({ state, isLoading, onRetry }: LibraryNoticeProps) {
  if (!state.videos.length) return null;
  const sync = state.sync;
  const sources = { youtube: "Synchronisation YouTube", mixed: "Données complétées depuis le cache", cache: "Copie précédente conservée", sheets: "Export Google Sheets" };
  const date = (value: number) => new Date(value).toLocaleString('fr-FR');
  return (
    <section aria-label="État de la bibliothèque" className="mb-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-slate-700 dark:text-slate-200">
      <div role="status" aria-live="polite">
        <p className="font-medium">{sync?.videoCount ?? state.videos.length} vidéos disponibles{sync?.privateVideoCount ? <> · {sync.privateVideoCount} {sync.privateVideoCount === 1 ? "vidéo privée" : "vidéos privées"}</> : null}</p>
        <p className="mt-1 text-sm">{sync ? sources[sync.source] : "Copie locale"} · {sync?.status === "complete" ? "Synchronisation complète" : sync?.status === "degraded" ? "Synchronisation partielle" : "Exhaustivité non vérifiée"}</p>
        <p className="mt-1 text-sm">{sync?.lastSuccessfulSync ? <>Dernière synchronisation complète : <time dateTime={sync.lastSuccessfulSync}>{date(Date.parse(sync.lastSuccessfulSync))}</time>.</> : "Date de dernière synchronisation complète inconnue."}</p>
        {sync?.status === "degraded" && <p className="mt-1 text-sm">La bibliothèque reste disponible, mais certaines données proviennent du cache ou n’ont pas pu être vérifiées.</p>}
        {sync?.lastAttempt && sync.status !== "complete" && <p className="mt-1 text-sm">Dernière tentative : <time dateTime={sync.lastAttempt}>{date(Date.parse(sync.lastAttempt))}</time>.</p>}
        {state.warning && <p>{state.warning}</p>}
        <p className="mt-1 text-sm">
          {state.source === 'local'
            ? state.publishedAt
              ? <>Copie locale publiée le <time dateTime={new Date(state.publishedAt).toISOString()}>{date(state.publishedAt)}</time>. </>
              : <>Date de publication de la copie locale inconnue. </>
            : null}
          {state.loadedAt !== null && <>Dernier chargement réussi le <time dateTime={new Date(state.loadedAt).toISOString()}>{date(state.loadedAt)}</time>.</>}
        </p>
      </div>
      {state.warning && <button type="button" disabled={isLoading} onClick={onRetry} className="mt-2 rounded-lg border border-amber-700 dark:border-amber-300 px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60">
        {isLoading ? 'Actualisation en cours…' : 'Réessayer l’actualisation'}
      </button>}
    </section>
  );
}
