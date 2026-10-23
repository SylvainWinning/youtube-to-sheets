import { SafeImage } from './ui/SafeImage';
import { Eye } from 'lucide-react';
import { VideoData } from '../types/video';
import { formatNumber } from '../utils/formatters';
import { formatDuration } from '../utils/durationUtils';
import { formatPublishDate } from '../utils/timeUtils';
import { getYouTubeUrl, saveVideoNavigation } from '../utils/videoUtils';
import { useSound } from '../hooks/useSound';
import { getPlaylistIds } from '../utils/videoLibrary';
import { getPlaylistLabel } from './PlaylistSelect';

interface VideoCardProps {
  video: VideoData;
}

export function VideoCard({ video }: VideoCardProps) {
  const { playClick } = useSound();
  const playlists = getPlaylistIds([video]);
  const membershipLabel = `Présente dans : ${playlists.map(getPlaylistLabel).join(', ')}`;

  const href = getYouTubeUrl(video.link);
  if (!href) return null;

  const handleClick = () => {
    playClick();
    saveVideoNavigation();
  };

  return (
    <article className="group p-3 rounded-xl bg-white dark:bg-neutral-800 shadow-[0_1px_3px_rgba(15,23,42,0.08)] flex flex-col">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Ouvrir ${video.title} sur YouTube`}
        onAuxClick={saveVideoNavigation}
        onClick={handleClick}
        className="flex flex-col flex-1 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-youtube-red-accessible dark:focus-visible:outline-youtube-red-accessible-dark"
      >
        <div className="relative aspect-video rounded-xl overflow-hidden mb-3">
          <SafeImage
            src={video.thumbnail}
            alt={video.title}
            loading="lazy"
            decoding="async"
            width={480}
            height={270}
            className="w-full h-full object-cover "
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
            <SafeImage
              src={video.channelAvatar}
              alt={video.channel}
              loading="lazy"
              decoding="async"
              width={24}
              height={24}
              className="w-6 h-6 rounded-full"
            />
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
    </article>
  );
}
