"use client";

import React, { memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Radio } from 'lucide-react';
import { useMusicPlayer } from '@/lib/MusicPlayerContext';
import { PlayButton } from '@/components/PlayButton';
import { AddToPlaylistButton } from '@/components/user/AddToPlaylistButton';
import type { RankingItem } from '@/lib/db';
import { formatNumber, getDisplayTitle, getYouTubeThumbnail } from '@/lib/utils/format-utils';

interface RankingSongTableRowProps {
  song: RankingItem;
}

const RankingSongTableRowComponent = ({ song }: RankingSongTableRowProps) => {
  const router = useRouter();
  const { startRadio } = useMusicPlayer();

  const handleRadioClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    startRadio('popular');
  }, [startRadio]);

  const handleRowClick = useCallback(() => {
    router.push(`/songs/${song.vocadbId}`);
  }, [router, song.vocadbId]);

  const thumbnailUrl = song.thumbUrl || (song.youtubeId ? getYouTubeThumbnail(song.youtubeId) : '/placeholder.png');
  const isTopThree = song.rank <= 3;

  // Determine which metric to display based on available data
  const displayMetric = song.weeklyIncrease && song.weeklyIncrease > 0
    ? { label: '주간 증가', value: `+${formatNumber(song.weeklyIncrease)}` }
    : song.dailyIncrease && song.dailyIncrease > 0
    ? { label: '일간 증가', value: `+${formatNumber(song.dailyIncrease)}` }
    : { label: '조회수', value: formatNumber(song.viewCount) };

  return (
    <div
      onClick={handleRowClick}
      className={`grid grid-cols-[auto_2fr_1.5fr_1fr_auto_auto_auto] gap-6 py-4 px-6
                 hover:bg-white/5 border-b border-white/5 cursor-pointer group transition-all ${
                   isTopThree ? 'shadow-[0_0_20px_rgba(205,255,0,0.1)]' : ''
                 }`}
    >
      {/* Rank */}
      <div
        className={`text-base font-medium self-center ${
          isTopThree ? 'text-[#CDFF00] drop-shadow-[0_0_8px_rgba(205,255,0,0.5)]' : 'text-white/40'
        }`}
      >
        #{song.rank}
      </div>

      {/* Thumbnail + Title */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="relative w-12 h-12 flex-shrink-0 rounded overflow-hidden">
          <Image
            src={thumbnailUrl}
            alt={getDisplayTitle(song)}
            fill
            className="object-cover"
            sizes="48px"
          />
        </div>
        <span className="text-white font-medium truncate">
          {getDisplayTitle(song)}
        </span>
      </div>

      {/* Artist */}
      <div className="text-white/60 truncate self-center">
        {song.artistString}
      </div>

      {/* Metric (Views/Increase) */}
      <div className="text-[#CDFF00] font-medium self-center" title={displayMetric.label}>
        {displayMetric.value}
      </div>

      {/* Playlist Button */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="opacity-0 group-hover:opacity-100 transition-opacity self-center"
      >
        <AddToPlaylistButton
          songId={song.vocadbId}
          songTitle={getDisplayTitle(song)}
          variant="ghost"
          size="icon"
        />
      </div>

      {/* Radio Button */}
      <button
        onClick={handleRadioClick}
        className="opacity-0 group-hover:opacity-100 transition-opacity self-center
                   w-9 h-9 flex items-center justify-center text-white/60 hover:text-[#CDFF00]
                   rounded-full hover:bg-white/10"
        aria-label="라디오 시작"
        title="이 곡 기반 라디오"
      >
        <Radio className="w-5 h-5" />
      </button>

      {/* Play Button */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center">
        <PlayButton song={song} variant="small" />
      </div>
    </div>
  );
};

export const RankingSongTableRow = memo(RankingSongTableRowComponent);
