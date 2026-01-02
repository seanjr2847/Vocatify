"use client";

import React from 'react';
import { useMusicPlayer } from '@/lib/MusicPlayerContext';

export function PlaylistLeftPanel() {
  const { state } = useMusicPlayer();

  return (
    <div className="flex flex-col items-center justify-center p-12 bg-gradient-to-b from-[#1a1a1a] to-[#121212]">
      {/* YouTube 플레이어 컨테이너 - 전체화면일 때 YouTubePlayer가 여기에 렌더링됨 */}
      <div id="youtube-player-container" className="w-[400px] h-[400px] mb-8 shadow-2xl rounded-lg overflow-hidden">
        {!state.currentSong && (
          <div className="w-full h-full bg-[#282828] rounded-lg flex items-center justify-center">
            <span className="text-gray-600 text-lg">No song playing</span>
          </div>
        )}
      </div>

      {/* 곡 정보 */}
      <h1 className="text-4xl font-bold text-white text-center mb-2">
        {state.currentSong?.titleKorean ?? state.currentSong?.titleEnglish ?? state.currentSong?.defaultName ?? '곡을 선택하세요'}
      </h1>
      <p className="text-xl text-gray-400 text-center">
        {state.currentSong?.artistString || ''}
      </p>
    </div>
  );
}
