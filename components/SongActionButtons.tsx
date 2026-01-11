"use client";

import { Heart, Share2, Plus } from 'lucide-react';
import { PlaySongButton } from '@/components/PlaySongButton';
import type { Song } from '@/lib/db';

interface SongActionButtonsProps {
  song: Song & {
    titleKorean?: string | null;
    titleEnglish?: string | null;
    artistString: string;
  };
}

export function SongActionButtons({ song }: SongActionButtonsProps) {
  const handleShare = async () => {
    const title = song.titleKorean ?? song.titleEnglish ?? song.defaultName;
    const text = `${song.artistString} - ${title}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url: window.location.href,
        });
      } catch (error) {
        // 사용자가 공유를 취소한 경우 등 무시
        console.log('Share cancelled or failed:', error);
      }
    }
  };

  return (
    <div className="flex items-center gap-3 mb-6 animate-fadeIn">
      <PlaySongButton song={song} />

      <button
        className="flex items-center justify-center w-12 h-12 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] transition-colors"
        aria-label="좋아요"
      >
        <Heart className="w-6 h-6" />
      </button>

      <button
        onClick={handleShare}
        className="flex items-center justify-center w-12 h-12 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] transition-colors"
        aria-label="공유하기"
      >
        <Share2 className="w-6 h-6" />
      </button>

      <button
        className="flex items-center gap-2 px-4 py-3 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] transition-colors"
        aria-label="플레이리스트에 추가"
      >
        <Plus className="w-5 h-5" />
        <span className="text-sm font-medium">플레이리스트 추가</span>
      </button>
    </div>
  );
}
