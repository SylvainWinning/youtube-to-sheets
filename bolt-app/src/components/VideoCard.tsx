import { useState } from 'react';
import { Eye, Check } from 'lucide-react';
import { VideoData } from '../types/video';
import { formatNumber } from '../utils/formatters';
import { formatDuration } from '../utils/durationUtils';
import { formatPublishDate } from '../utils/timeUtils';
import { getYouTubeUrl, saveVideoNavigation } from '../utils/videoUtils';
import { useSound } from '../hooks/useSound';
import { useVideoChoice } from '../hooks/useVideoChoice';
import { getVideoIdentity, getPlaylistIds } from '../utils/videoLibrary';
import { getPlaylistLabel } from './PlaylistSelect';

interface VideoCardProps {
  video: VideoData;
}

export function VideoCard({ video }: VideoCardProps) {
  const { playClick } = useSound();
  const { preferences, storageError, setWatched } = useVideoChoice();
  const [changedHere, setChangedHere] = useState(false);
  const identity = getVideoIdentity(video);
  const watched = preferences.watched.includes(identity);
  const playlists = getPlaylistIds([video]);
  const membershipLabel = `Présente dans : ${playlists.map(getPlaylistLabel).join(', ')}`;

  const href = getYouTubeUrl(video.link);
  if (!href) return null;

  const handleClick = () => {
    playClick();
    saveVideoNavigation();
  };

  return (
    <article className="group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-youtube-red-accessible dark:focus-visible:outline-youtube-red-accessible-dark p-3 rounded-xl transition-all duration-200 hover:scale-[1.02] bg-neu-base dark:bg-neutral-700/50 shadow-[2px_2px_4px_#d1d9e6,_-2px_-2px_4px_#ffffff] dark:shadow-[2px_2px_4px_rgba(0,0,0,0.2),_-2px_-2px_4px_rgba(255,255,255,0.05)] hover:shadow-[4px_4px_8px_#d1d9e6,_-4px_-4px_8px_#ffffff] dark:hover:shadow-[4px_4px_8px_rgba(0,0,0,0.25),_-4px_-4px_8px_rgba(255,255,255,0.1)] flex flex-col">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Ouvrir ${video.title} sur YouTube`}
        onAuxClick={saveVideoNavigation}
        onClick={handleClick}
        className="flex flex-col flex-1 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-youtube-red-accessible dark:focus-visible:outline-youtube-red-accessible-dark"
      >
        <div className="relative aspect-video rounded-xl overflow-hidden mb-3 shadow-[inset_2px_2px_4px_rgba(209,217,230,0.4),_inset_-2px_-2px_4px_rgba(255,255,255,0.4)] dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),_inset_-2px_-2px_4px_rgba(255,255,255,0.05)]">
          <img
            src={video.thumbnail}
            alt={video.title}
            loading="lazy"
            decoding="async"
            width={480}
            height={270}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 text-white text-xs font-medium rounded-sm">
            {formatDuration(video.duration)}
          </div>
        </div>

        <div className="flex flex-col flex-1">
          <h3 className="font-medium text-[14px] leading-5 text-youtube-black dark:text-white line-clamp-2 group-hover:text-youtube-red-accessible dark:group-hover:text-youtube-red-accessible-dark transition-colors mb-1">
            {video.title}
          </h3>

          <div className="flex items-center gap-2 text-[13px] text-youtube-gray-dark dark:text-gray-400 mb-1">
            {video.channelAvatar && (
              <img
                src={video.channelAvatar}
                alt={video.channel}
                loading="lazy"
                decoding="async"
                width={24}
                height={24}
                className="w-6 h-6 rounded-full"
              />
            )}
            <div>{video.channel}</div>
          </div>

          {playlists.length > 1 && (
            <span className="text-xs text-youtube-gray-dark dark:text-gray-300 mb-1" title={membershipLabel} aria-label={membershipLabel}>
              {playlists.length} playlists
            </span>
          )}

          <div className="mt-auto flex items-center gap-1 text-[13px] text-youtube-gray-dark dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {formatNumber(video.views)}
            </span>
            <span className="mx-1">•</span>
            <span>{formatPublishDate(video.publishedAt)}</span>
          </div>
        </div>
      </a>
      <button type="button" aria-pressed={watched}
        aria-label={`Marquer comme vue : ${video.title}`}
        onClick={() => { setChangedHere(true); setWatched(identity, !watched); }}
        className="mt-2 min-h-11 flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-neutral-500 px-3 py-2 text-sm text-youtube-black dark:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-youtube-red-accessible dark:focus-visible:outline-youtube-red-accessible-dark">
        {watched && <Check aria-hidden="true" className="w-4 h-4" />}
        {watched ? 'Vue · Annuler' : 'Marquer comme vue'}
      </button>
      {storageError && changedHere && <p role="status" className="mt-1 text-xs text-gray-600 dark:text-gray-300">Marquage conservé pour cette session uniquement.</p>}
    </article>
  );
}
