import React from 'react';
import { ListVideo } from 'lucide-react';
import type { VideoData } from '../types/video';
import { DropdownMenu } from './ui/DropdownMenu';
import { DropdownItem } from './ui/DropdownItem';

const PLAYLIST_LABELS: Record<string, string> = {
  PLtBV_WamBQbAxyF08PXaPxfFwcTejP9vR: 'Playlist principale',
  PLtBV_WamBQbCWySxrSDkbEcTYsxZ8FOvx: 'Vrouuum',
};

function getPlaylistLabel(playlistId: string): string {
  return PLAYLIST_LABELS[playlistId] ?? `Playlist ${playlistId.slice(0, 8)}…`;
}

interface PlaylistSelectProps {
  videos: VideoData[];
  selectedPlaylistId: string | null;
  onPlaylistChange: (playlistId: string | null) => void;
  className?: string;
}

export function PlaylistSelect({
  videos,
  selectedPlaylistId,
  onPlaylistChange,
  className = '',
}: PlaylistSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const playlistIds = React.useMemo(
    () => Array.from(new Set(videos.map(v => v.playlistId).filter(Boolean) as string[])),
    [videos],
  );

  const label = selectedPlaylistId ? getPlaylistLabel(selectedPlaylistId) : 'Playlists';

  if (playlistIds.length <= 1) return null;

  return (
    <DropdownMenu
      icon={<ListVideo className="w-5 h-5" />}
      label={label}
      isOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
      className={className}
    >
      <DropdownItem
        onClick={() => {
          onPlaylistChange(null);
          setIsOpen(false);
        }}
        isSelected={selectedPlaylistId === null}
      >
        Toutes les playlists
      </DropdownItem>
      {playlistIds.map((playlistId) => (
        <DropdownItem
          key={playlistId}
          onClick={() => {
            onPlaylistChange(playlistId);
            setIsOpen(false);
          }}
          isSelected={selectedPlaylistId === playlistId}
        >
          {getPlaylistLabel(playlistId)}
        </DropdownItem>
      ))}
    </DropdownMenu>
  );
}
