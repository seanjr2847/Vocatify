"use client";

import { Play } from "lucide-react";
import { useMusicPlayer } from "@/lib/MusicPlayerContext";
import { Song } from "@/lib/db";

interface PlaySongButtonProps {
  song: Song;
}

export function PlaySongButton({ song }: PlaySongButtonProps) {
  const { playSong } = useMusicPlayer();

  return (
    <button
      onClick={() => playSong(song)}
      className="flex items-center justify-center w-14 h-14 rounded-full bg-[#39c5bb] hover:scale-105 hover:bg-[#45d1c7] transition-all shadow-lg"
    >
      <Play className="w-6 h-6 text-black fill-black ml-1" />
    </button>
  );
}
