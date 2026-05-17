import React from 'react';
import { ListVideo } from 'lucide-react';
import type { VideoData } from '../types/video';
import { DropdownMenu } from './ui/DropdownMenu';
import { DropdownItem } from './ui/DropdownItem';

const NEW_PLAYLIST_ID = 'PLtBV_WamBQbCWySxrSDkbEcTYsxZ8FOvx';

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

  const hasNewPlaylist = playlistIds.includes(NEW_PLAYLIST_ID);
  const label = selectedPlaylistId
    ? selectedPlaylistId === NEW_PLAYLIST_ID
      ? 'Nouvelle playlist'
      : 'Playlist principale'
    : 'Playlists';

  if (playlistIds.length <= 1 && !hasNewPlaylist) return null;

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
          {playlistId === NEW_PLAYLIST_ID ? 'Nouvelle playlist' : 'Playlist principale'}
        </DropdownItem>
      ))}
    </DropdownMenu>
  );
}
