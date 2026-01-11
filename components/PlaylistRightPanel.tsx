"use client";

import React from 'react';
import { useMusicPlayer } from '@/lib/MusicPlayerContext';
import { PlaylistTabs } from './PlaylistTabs';
import { QueueTabContent } from './QueueTabContent';
import { LyricsTabContent } from './LyricsTabContent';

export function PlaylistRightPanel() {
  const { state, setActiveTab } = useMusicPlayer();

  return (
    <div className="flex flex-col h-full bg-[#121212] overflow-hidden">
      {/* 탭 네비게이션 */}
      <PlaylistTabs activeTab={state.activeTab} onTabChange={setActiveTab} />

      {/* 컨텐츠 영역 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {state.activeTab === 'queue' && <QueueTabContent />}
        {state.activeTab === 'suggested' && (
          <div className="p-8 text-gray-400 text-center">준비 중...</div>
        )}
        {state.activeTab === 'lyrics' && <LyricsTabContent />}
        {state.activeTab === 'credits' && (
          <div className="p-8 text-gray-400 text-center">준비 중...</div>
        )}
      </div>
    </div>
  );
}
