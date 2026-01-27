"use client";

import { DraggablePlaylistSongs } from "./DraggablePlaylistSongs";

/**
 * PlaylistSongsList Client Component
 *
 * Wrapper for DraggablePlaylistSongs to enable client-side interactivity
 * Vercel React Best Practices Applied:
 * - server-serialization: Minimal data passed from server
 */

interface Song {
  vocadbId: number;
  defaultName: string;
  titleKorean: string | null;
  titleEnglish: string | null;
  titleJapanese: string | null;
  titleRomaji: string | null;
  artistString: string | null;
  thumbUrl: string | null;
  viewCount: bigint | null;
  lengthSeconds: number | null;
}

interface PlaylistSong {
  id: string;
  songId: number;
  order: number;
  song: Song;
}

interface PlaylistSongsListProps {
  playlistId: string;
  songs: PlaylistSong[];
  isOwner: boolean;
}

export function PlaylistSongsList({
  playlistId,
  songs,
  isOwner,
}: PlaylistSongsListProps) {
  return (
    <DraggablePlaylistSongs
      playlistId={playlistId}
      songs={songs}
      isOwner={isOwner}
    />
  );
}
