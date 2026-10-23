import { SafeImage } from './ui/SafeImage';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Shuffle, X } from 'lucide-react';
import type { VideoData } from '../types/video';
import { getVideoIdentity, uniqueVideoCandidates } from '../utils/videoLibrary';
import { getYouTubeUrl, saveVideoNavigation } from '../utils/videoUtils';
import { drawVideo } from '../utils/videoChoice';

export function VideoChooser({ videos }: { videos: VideoData[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const candidates = useMemo(() => uniqueVideoCandidates(videos), [videos]);
  // A filter change must never leave an out-of-filter preview available to open.
  const selected = videos.find(video => getVideoIdentity(video) === selectedId);
  const hasAlternative = candidates.some(video => getVideoIdentity(video) !== selectedId);
  const url = selected ? getYouTubeUrl(selected.link) : null;

  useEffect(() => {
    if (isOpen) {
      if (!dialog.current?.open) dialog.current?.showModal();
    } else if (dialog.current?.open) dialog.current.close();
  }, [isOpen]);

  function choose(previous: string | null = null) {
    const video = drawVideo(candidates, previous);
    if (video) setSelectedId(getVideoIdentity(video));
  }

  return <>
    <button ref={trigger} type="button" onClick={() => { choose(); setIsOpen(true); }} disabled={videos.length === 0}
      className="primary-action rounded-xl px-3 py-2 text-sm min-h-11 flex items-center gap-2 disabled:opacity-50">
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
      {selected && <div className="video-choice-preview" aria-live="polite" aria-atomic="true">
        <SafeImage src={selected.thumbnail} alt="" width={480} height={270} className="video-choice-image w-full aspect-video object-cover rounded-lg" />
        <div className="video-choice-copy min-w-0">
          <h3 className="font-semibold break-words">{selected.title}</h3>
          <p className="text-sm mt-1">{selected.channel} · {selected.duration}</p>
        </div>
      </div>}
      {!selected && <p role="status">Aucune vidéo ne correspond aux filtres actifs.</p>}
      <div className="video-choice-actions mt-4 flex flex-wrap gap-2">
        {url && <a href={url} target="_blank" rel="noopener noreferrer" onClick={saveVideoNavigation} onAuxClick={saveVideoNavigation}
          className="primary-action rounded-xl px-4 py-3 text-sm">Ouvrir sur YouTube</a>}
        <button type="button" disabled={!hasAlternative} onClick={() => choose(selectedId)}
          className="neu-button rounded-xl px-4 py-3 text-sm disabled:opacity-50">Autre choix</button>
      </div>
      {selected && !hasAlternative && <p role="status" className="text-sm mt-3">Une seule vidéo correspond aux filtres actifs.</p>}
    </dialog>
  </>;
}
