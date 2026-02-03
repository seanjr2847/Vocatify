"use client";

import React from 'react';
import { useMusicPlayer } from '@/lib/MusicPlayerContext';
import { PlaylistTabs } from './PlaylistTabs';
import { QueueTabContent } from './QueueTabContent';
import { RadioTabContent } from './RadioTabContent';
import { LyricsTabContent } from './LyricsTabContent';

export function PlaylistRightPanel() {
  const { state, setActiveTab } = useMusicPlayer();

  // 라디오 모드인지 확인
  const hasRadio = state.activeSource === 'radio' && state.radioChannel !== null;

  return (
    <div className="flex flex-col h-full bg-[#121212] overflow-hidden">
      {/* 탭 네비게이션 */}
      <PlaylistTabs
        activeTab={state.activeTab}
        onTabChange={setActiveTab}
        hasRadio={hasRadio}
      />

      {/* 컨텐츠 영역 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {state.activeTab === 'queue' && <QueueTabContent />}
        {state.activeTab === 'radio' && <RadioTabContent />}
        {state.activeTab === 'lyrics' && <LyricsTabContent />}
      </div>
    </div>
  );
}
