"use client";

import React, { memo, useMemo } from 'react';
import Image from 'next/image';
import { Radio, StopCircle, History } from 'lucide-react';
import { useMusicPlayer } from '@/lib/MusicPlayerContext';
import { Song } from '@/lib/db';
import { getDisplayTitle } from '@/lib/utils/format-utils';

// YouTube 썸네일 URL 생성
function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

interface SongItemProps {
  song: Song;
  onPlay?: () => void;
  isPlaying?: boolean;
}

// 곡 아이템 컴포넌트 - Memoized
const SongItem = memo(function SongItem({
  song,
  onPlay,
  isPlaying = false,
}: SongItemProps) {
  const thumbnailUrl = song.thumbUrl || (song.youtubeId ? getYouTubeThumbnail(song.youtubeId) : '/placeholder.png');

  return (
    <div
      className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
        isPlaying
          ? 'bg-[#39c5bb15] border border-[#39c5bb30]'
          : onPlay ? 'hover:bg-white/5 cursor-pointer' : ''
      }`}
      onClick={onPlay}
    >
      {isPlaying && (
        <div className="p-1 text-[#39c5bb]">
          <div className="w-4 h-4 flex items-center justify-center">
            <div className="w-2 h-2 bg-[#39c5bb] rounded-full animate-pulse" />
          </div>
        </div>
      )}
      <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
        <Image
          src={thumbnailUrl}
          alt={getDisplayTitle(song)}
          fill
          className="object-cover"
          sizes="48px"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{getDisplayTitle(song)}</p>
        <p className="text-gray-400 text-xs truncate">{song.artistString}</p>
      </div>
    </div>
  );
});

export function RadioTabContent() {
  const { state, playSong, stopRadio } = useMusicPlayer();

  // 최근 재생 히스토리 (역순으로 표시)
  const recentHistory = useMemo(() =>
    [...state.radioHistory].reverse().slice(0, 10),
    [state.radioHistory]
  );

  // 라디오 모드가 아닐 때
  if (state.activeSource !== 'radio' || !state.radioChannel) {
    return (
      <div className="p-8 text-center text-gray-400">
        <Radio className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>라디오가 재생 중이지 않습니다</p>
        <p className="text-sm text-gray-500 mt-2">라디오를 시작하면 여기에 표시됩니다</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Radio Channel Info */}
      <div className="px-4 py-4 mb-6 bg-gradient-to-r from-[#39c5bb]/20 to-[#39c5bb]/5 border border-[#39c5bb]/30 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#39c5bb]/20 flex items-center justify-center">
              <Radio className="w-5 h-5 text-[#39c5bb] animate-pulse" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">
                {state.radioChannel.name}
              </p>
              <p className="text-sm text-white/60">
                {state.radioQueue.length}곡 대기 중
              </p>
            </div>
          </div>
          <button
            onClick={stopRadio}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white/80 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all"
          >
            <StopCircle className="w-4 h-4" />
            라디오 중지
          </button>
        </div>
      </div>

      {/* 현재 재생 중인 곡 */}
      {state.currentSong && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Now Playing
          </h3>
          <SongItem song={state.currentSong} isPlaying />
        </div>
      )}

      {/* 다음 곡 목록 */}
      {state.radioQueue.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Up Next ({state.radioQueue.length})
          </h3>
          <div className="space-y-1">
            {state.radioQueue.slice(0, 10).map((song) => (
              <SongItem
                key={song.vocadbId}
                song={song}
                onPlay={() => playSong(song)}
              />
            ))}
            {state.radioQueue.length > 10 && (
              <p className="text-center text-gray-500 text-sm py-2">
                + {state.radioQueue.length - 10}곡 더 있음
              </p>
            )}
          </div>
        </div>
      )}

      {/* 최근 재생 히스토리 */}
      {recentHistory.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <History className="w-4 h-4" />
            Recently Played
          </h3>
          <div className="space-y-1 opacity-70">
            {recentHistory.map((song) => (
              <SongItem
                key={song.vocadbId}
                song={song}
                onPlay={() => playSong(song)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
