"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Play, Plus, Radio } from 'lucide-react';
import { useMusicPlayer } from '@/lib/MusicPlayerContext';
import type { RankingItem } from '@/lib/db';

interface RankingSongCardProps {
  song: RankingItem;
}

function formatNumber(num: number | bigint | null | undefined): string {
  if (!num) return '0';
  const n = typeof num === 'bigint' ? Number(num) : num;
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }
  return n.toString();
}

function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

function formatPublishDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diffTime = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '오늘 발매';
  if (diffDays === 1) return '어제 발매';
  if (diffDays < 7) return `${diffDays}일 전 발매`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전 발매`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전 발매`;

  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function RankingSongCard({ song }: RankingSongCardProps) {
  const router = useRouter();
  const { playSong, addToPlaylist, startRadio } = useMusicPlayer();

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playSong(song);
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToPlaylist(song);
  };

  const handleRadioClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    startRadio(song.vocadbId);
  };

  const handleCardClick = () => {
    router.push(`/songs/${song.vocadbId}`);
  };

  const thumbnailUrl = song.thumbUrl || getYouTubeThumbnail(song.youtubeId);
  const isTopThree = song.rank <= 3;

  return (
    <div
      onClick={handleCardClick}
      className="bg-[#1a1a1a] rounded-[20px] hover:bg-[#2a2a2a] transition-colors cursor-pointer group p-4"
    >
      <div className="flex items-center gap-4">
        {/* Rank Number */}
        <div
          className={`text-2xl font-bold w-12 text-center ${
            isTopThree ? 'text-[#facd66]' : 'text-white/40'
          }`}
        >
          #{song.rank}
        </div>

        {/* Thumbnail */}
        <div className="relative w-16 h-16 flex-shrink-0">
          <img
            src={thumbnailUrl}
            alt={song.title}
            className="w-full h-full object-cover rounded-lg"
            loading="lazy"
          />
        </div>

        {/* Song Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold truncate">{song.title}</h3>
          <p className="text-gray-400 text-sm truncate">{song.artist}</p>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
            {song.viewCount && (
              <span>{formatNumber(song.viewCount)} 조회</span>
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
                <span className="text-[#39c5bb]">{formatPublishDate(song.publishDate)}</span>
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
            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-[#39c5bb] transition-colors rounded-full hover:bg-white/10"
            aria-label="라디오 시작"
            title="이 곡 기반 라디오"
          >
            <Radio className="w-5 h-5" />
          </button>
          <button
            onClick={handlePlayClick}
            className="w-12 h-12 flex items-center justify-center bg-[#facd66] hover:bg-[#facd66]/90 text-black rounded-full transition-all hover:scale-105"
            aria-label="재생"
          >
            <Play className="w-5 h-5 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
}
