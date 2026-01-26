'use client';

import Image from 'next/image';
import { RankingItem } from '@/lib/db';

interface TrendingTableRowProps {
  song: RankingItem;
  rank: number;
  onPlay?: (song: RankingItem) => void;
}

export default function TrendingTableRow({ song, rank, onPlay }: TrendingTableRowProps) {
  const formatViews = (views: bigint | number | null) => {
    if (!views) return '0';
    const num = Number(views);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  const handlePlay = () => {
    if (onPlay) {
      onPlay(song);
    }
  };

  return (
    <div className="group grid grid-cols-[auto_2fr_1.5fr_1.5fr_auto_auto] gap-6 py-4 px-6 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5">
      {/* Rank */}
      <div className="text-white/40 font-medium w-8 flex items-center">
        {rank}
      </div>

      {/* Album Cover + Title */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="relative w-12 h-12 flex-shrink-0">
          <Image
            src={song.thumbUrl || '/default-album.png'}
            fill
            alt=""
            className="object-cover"
          />
        </div>
        <p className="text-white font-medium truncate">
          {song.titleKorean || song.titleEnglish || song.titleJapanese || song.defaultName}
        </p>
      </div>

      {/* Artist */}
      <div className="text-white/60 truncate flex items-center">
        {song.artistString}
      </div>

      {/* Album (or placeholder) */}
      <div className="text-white/60 truncate flex items-center">
        {song.titleEnglish || '-'}
      </div>

      {/* Weekly Increase / Views */}
      <div className="text-[#CDFF00] font-medium text-right flex items-center justify-end">
        {song.weeklyIncrease ? `+${formatViews(song.weeklyIncrease)}` : formatViews(song.viewCount)}
      </div>

      {/* Hover Play Button */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
        <button
          onClick={handlePlay}
          className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-transform"
        >
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
