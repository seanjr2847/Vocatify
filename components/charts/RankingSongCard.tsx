"use client";

import React, { memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Play, Plus, Radio } from 'lucide-react';
import { useMusicPlayer } from '@/lib/MusicPlayerContext';
import type { RankingItem } from '@/lib/db';
import { formatNumber, getDisplayTitle, getYouTubeThumbnail, formatPublishDate, formatDuration } from '@/lib/utils/format-utils';
import { toast } from 'sonner';

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
  const { playSong, addToPlaylist, startRadio } = useMusicPlayer();

  const handlePlayClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (song.youtubeId == null) {
      toast.error('YouTube 영상이 없는 곡입니다');
      return;
    }
    playSong(song);
  }, [playSong, song]);

  const handleAddClick = useCallback((e: React.MouseEvent) => {
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
            isTopThree ? 'text-[#CDFF00] drop-shadow-[0_0_8px_rgba(205,255,0,0.5)]' : 'text-white/40'
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
                <span className="text-[#CDFF00]">+{formatNumber(song.dailyIncrease)} 일간</span>
              </>
            )}
            {song.weeklyIncrease && song.weeklyIncrease > 0 && (
              <>
                <span>•</span>
                <span className="text-[#CDFF00]">+{formatNumber(song.weeklyIncrease)} 주간</span>
              </>
            )}
            {song.publishDate && !song.dailyIncrease && !song.weeklyIncrease && (
              <>
                <span>•</span>
                <span className="text-[#CDFF00]">{formatPublishDateWithSuffix(song.publishDate)}</span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleAddClick}
            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/10"
            aria-label="재생목록에 추가"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={handleRadioClick}
            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-[#CDFF00] transition-colors rounded-full hover:bg-white/10"
            aria-label="라디오 시작"
            title="이 곡 기반 라디오"
          >
            <Radio className="w-5 h-5" />
          </button>
          <button
            onClick={handlePlayClick}
            disabled={song.youtubeId == null}
            className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${
              song.youtubeId != null
                ? 'bg-[#CDFF00] hover:bg-[#CDFF00]/90 text-black hover:scale-105 cursor-pointer'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
            }`}
            aria-label="재생"
            title={song.youtubeId != null ? '재생' : 'YouTube 영상 없음'}
          >
            <Play className="w-5 h-5 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders when parent updates
export const RankingSongCard = memo(RankingSongCardComponent);
