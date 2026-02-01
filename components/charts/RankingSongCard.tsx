"use client";

import React, { memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Radio, Plus } from 'lucide-react';
import { useMusicPlayer } from '@/lib/MusicPlayerContext';
import { PlayButton } from '@/components/PlayButton';
import { AddToPlaylistButton } from '@/components/user/AddToPlaylistButton';
import type { RankingItem } from '@/lib/db';
import { formatNumber, getDisplayTitle, getYouTubeThumbnail, formatPublishDate, formatDuration } from '@/lib/utils/format-utils';

interface RankingSongCardProps {
  song: RankingItem;
}

// RankingSongCard에서는 "발매" 텍스트를 붙여서 표시
function formatPublishDateWithSuffix(date: Date | string | null | undefined): string {
  const formatted = formatPublishDate(date);
  if (!formatted) return '';
  if (formatted.includes('전') || formatted === '오늘' || formatted === '어제') {
    return formatted + ' 발매';
  }
  return formatted;
}

const RankingSongCardComponent = ({ song }: RankingSongCardProps) => {
  const router = useRouter();
  const { addToPlaylist, startRadio } = useMusicPlayer();


  const handleAddToQueue = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    addToPlaylist(song);
  }, [addToPlaylist, song]);

  const handleRadioClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    startRadio('popular'); // Start with popular channel
  }, [startRadio]);

  const handleCardClick = useCallback(() => {
    router.push(`/songs/${song.vocadbId}`);
  }, [router, song.vocadbId]);

  const thumbnailUrl = song.thumbUrl || (song.youtubeId ? getYouTubeThumbnail(song.youtubeId) : '/placeholder.png');
  const isTopThree = song.rank <= 3;

  return (
    <div
      onClick={handleCardClick}
      className={`bg-white/5 rounded-[20px] hover:bg-white/10 transition-all cursor-pointer group p-4 ${
        isTopThree ? 'shadow-[0_0_20px_rgba(205,255,0,0.15)]' : ''
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Rank Number */}
        <div
          className={`text-2xl font-bold w-12 text-center ${
            isTopThree ? 'text-[#39c5bb] drop-shadow-[0_0_8px_rgba(205,255,0,0.5)]' : 'text-white/40'
          }`}
        >
          #{song.rank}
        </div>

        {/* Thumbnail */}
        <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden">
          <Image
            src={thumbnailUrl}
            alt={getDisplayTitle(song)}
            fill
            className="object-cover"
            sizes="64px"
          />
        </div>

        {/* Song Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold truncate">{getDisplayTitle(song)}</h3>
          <p className="text-gray-400 text-sm truncate">{song.artistString}</p>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
            {song.viewCount && (
              <span>{formatNumber(song.viewCount)} 조회</span>
            )}
            {song.lengthSeconds && (
              <>
                <span>•</span>
                <span>{formatDuration(song.lengthSeconds)}</span>
              </>
            )}
            {song.dailyIncrease && song.dailyIncrease > 0 && (
              <>
                <span>•</span>
                <span className="text-[#39c5bb]">+{formatNumber(song.dailyIncrease)} 일간</span>
              </>
            )}
            {song.weeklyIncrease && song.weeklyIncrease > 0 && (
              <>
                <span>•</span>
                <span className="text-[#39c5bb]">+{formatNumber(song.weeklyIncrease)} 주간</span>
              </>
            )}
            {song.publishDate && !song.dailyIncrease && !song.weeklyIncrease && (
              <>
                <span>•</span>
                <span className="text-[#39c5bb]">{formatPublishDateWithSuffix(song.publishDate)}</span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleAddToQueue}
            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/10"
            aria-label="재생 큐에 추가"
            title="재생 큐에 추가"
          >
            <Plus className="w-5 h-5" />
          </button>
          <div onClick={(e) => e.stopPropagation()}>
            <AddToPlaylistButton
              songId={song.vocadbId}
              songTitle={getDisplayTitle(song)}
              variant="ghost"
              size="icon"
            />
          </div>
          <button
            onClick={handleRadioClick}
            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-[#39c5bb] transition-colors rounded-full hover:bg-white/10"
            aria-label="라디오 시작"
            title="이 곡 기반 라디오"
          >
            <Radio className="w-5 h-5" />
          </button>
          <PlayButton song={song} />
        </div>
      </div>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders when parent updates
export const RankingSongCard = memo(RankingSongCardComponent);
