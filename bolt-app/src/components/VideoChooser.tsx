import { useEffect, useMemo, useRef, useState } from 'react';
import { Shuffle, X } from 'lucide-react';
import type { VideoData } from '../types/video';
import { getVideoIdentity } from '../utils/videoLibrary';
import { getYouTubeUrl, saveVideoNavigation } from '../utils/videoUtils';
import { choiceCandidates, drawVideo, readChoicePreferences, CHOICE_STORAGE_KEY, type ChoicePreferences } from '../utils/videoChoice';

export function VideoChooser({ videos }: { videos: VideoData[] }) {
  const [preferences, setPreferences] = useState(() => {
    try { return readChoicePreferences(window.localStorage); }
    catch { return { watched: [], excludeWatched: false }; }
  });
  const [storageError, setStorageError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const candidates = useMemo(() => choiceCandidates(videos, preferences), [videos, preferences]);
  // A filter change must never leave an out-of-filter preview available to open.
  const selected = videos.find(video => getVideoIdentity(video) === selectedId);
  const hasAlternative = candidates.some(video => getVideoIdentity(video) !== selectedId);
  const url = selected ? getYouTubeUrl(selected.link) : null;

  useEffect(() => {
    if (isOpen) {
      if (!dialog.current?.open) dialog.current?.showModal();
    } else if (dialog.current?.open) dialog.current.close();
  }, [isOpen]);

  function updatePreferences(next: ChoicePreferences) {
    setPreferences(next);
    try {
      window.localStorage.setItem(CHOICE_STORAGE_KEY, JSON.stringify(next));
      setStorageError(false);
    } catch { setStorageError(true); }
  }

  function choose(previous: string | null = null) {
    const video = drawVideo(candidates, previous);
    if (video) setSelectedId(getVideoIdentity(video));
  }

  return <>
    <button ref={trigger} type="button" onClick={() => { choose(); setIsOpen(true); }} disabled={videos.length === 0}
      className="neu-button rounded-xl px-3 py-2 text-sm min-h-11 flex items-center gap-2 disabled:opacity-50">
      <Shuffle aria-hidden="true" className="w-4 h-4 shrink-0" /> Choisir une vidéo
    </button>
    <dialog ref={dialog} aria-labelledby="video-choice-title" aria-describedby="video-choice-scope"
      onClose={() => { setIsOpen(false); setSelectedId(null); trigger.current?.focus({ preventScroll: true }); }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl p-4 sm:p-6 bg-white dark:bg-neutral-800 text-youtube-black dark:text-white backdrop:bg-black/60">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h2 id="video-choice-title" className="font-semibold text-lg">Le choix du hasard</h2>
        <button type="button" aria-label="Fermer l’aperçu" onClick={() => dialog.current?.close()}
          className="neu-button rounded-lg min-h-11 min-w-11 flex items-center justify-center"><X aria-hidden="true" className="w-5 h-5" /></button>
      </div>
      <p id="video-choice-scope" className="text-sm mb-3">Le tirage respecte les filtres actifs. La vidéo s’ouvre uniquement avec « Ouvrir sur YouTube ».</p>
      {selected && <div aria-live="polite" aria-atomic="true">
        <img src={selected.thumbnail} alt="" width={480} height={270} className="w-full aspect-video object-cover rounded-lg" />
        <h3 className="font-semibold mt-3 break-words">{selected.title}</h3>
        <p className="text-sm mt-1">{selected.channel} · {selected.duration}</p>
      </div>}
      {!selected && <p role="status">Aucune vidéo à proposer. Désactive l’exclusion des vidéos vues ou modifie les filtres.</p>}
      <div className="my-3 space-y-2 text-sm">
        {selected && <label className="flex items-center gap-2 min-h-11">
          <input type="checkbox" checked={preferences.watched.includes(selectedId!)} onChange={event => updatePreferences({
            ...preferences, watched: event.target.checked ? [...preferences.watched, selectedId!] : preferences.watched.filter(id => id !== selectedId),
          })} /> Marquer cette vidéo comme vue
        </label>}
        <label className="flex items-center gap-2 min-h-11">
          <input type="checkbox" checked={preferences.excludeWatched} onChange={event => updatePreferences({ ...preferences, excludeWatched: event.target.checked })} />
          Exclure les vidéos marquées vues
        </label>
        <p className="text-gray-600 dark:text-gray-300">{storageError ? 'Mémorisation indisponible : ces choix restent valables pour cette session.' : 'Marquages et préférence conservés sur ce navigateur.'}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {url && <a href={url} target="_blank" rel="noopener noreferrer" onClick={saveVideoNavigation} onAuxClick={saveVideoNavigation}
          className="neu-button rounded-xl px-4 py-3 text-sm">Ouvrir sur YouTube</a>}
        <button type="button" disabled={!hasAlternative} onClick={() => choose(selectedId)}
          className="neu-button rounded-xl px-4 py-3 text-sm disabled:opacity-50">Autre choix</button>
      </div>
      {selected && !hasAlternative && <p role="status" className="text-sm mt-3">{preferences.excludeWatched
        ? 'Aucune autre vidéo avec ces filtres. Tu peux désactiver l’exclusion des vidéos vues.'
        : 'Une seule vidéo correspond aux filtres actifs.'}</p>}
    </dialog>
  </>;
}
