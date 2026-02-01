"use client";

import { Play } from "lucide-react";
import { useMusicPlayer } from "@/lib/MusicPlayerContext";
import { Song } from "@/lib/db";

interface PlayButtonProps {
  song: Song;
  variant?: 'default' | 'small' | 'minimal';
  className?: string;
  disabled?: boolean;
}

export function PlayButton({ song, variant = 'default', className = '', disabled }: PlayButtonProps) {
  const { playSong } = useMusicPlayer();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled && song.youtubeId != null) {
      playSong(song);
    }
  };

  const isDisabled = disabled || song.youtubeId == null;

  if (variant === 'minimal') {
    // Table row style - white background
    return (
      <button
        onClick={handleClick}
        disabled={isDisabled}
        className={`w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 transition-transform ${
          isDisabled
            ? 'bg-white/20 text-white/40 cursor-not-allowed'
            : 'bg-white text-black'
        } ${className}`}
        aria-label="재생"
        title={isDisabled ? 'YouTube 영상 없음' : '재생'}
      >
        <Play className="w-4 h-4 fill-current ml-0.5" />
      </button>
    );
  }

  if (variant === 'small') {
    // Card action button style
    return (
      <button
        onClick={handleClick}
        disabled={isDisabled}
        className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${
          isDisabled
            ? 'bg-white/10 text-white/40 cursor-not-allowed'
            : 'bg-[#39c5bb] hover:bg-[#39c5bb]/90 text-black hover:scale-105'
        } ${className}`}
        aria-label="재생"
        title={isDisabled ? 'YouTube 영상 없음' : '재생'}
      >
        <Play className="w-4 h-4 fill-current" />
      </button>
    );
  }

  // Default - large button
  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${
        isDisabled
          ? 'bg-white/10 text-white/40 cursor-not-allowed'
          : 'bg-[#39c5bb] hover:bg-[#39c5bb]/90 text-black hover:scale-105'
      } ${className}`}
      aria-label="재생"
      title={isDisabled ? 'YouTube 영상 없음' : '재생'}
    >
      <Play className="w-5 h-5 fill-current" />
    </button>
  );
}
