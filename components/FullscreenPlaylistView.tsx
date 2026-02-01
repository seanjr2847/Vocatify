"use client";

import React from 'react';
import { useMusicPlayer } from '@/lib/MusicPlayerContext';
import { PlaylistLeftPanel } from './PlaylistLeftPanel';
import { PlaylistRightPanel } from './PlaylistRightPanel';

export function FullscreenPlaylistView() {
  const { state } = useMusicPlayer();
  const isOpen = state.viewMode === 'fullscreen';

  return (
    <div
      className={`fixed left-0 right-0 bg-[#121212] z-40 transition-transform duration-300 ease-out ${
        isOpen ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ top: '73px', height: 'calc(100vh - 73px - 125px)' }}
    >
      <div className="grid grid-cols-[500px_1fr] h-full">
        <PlaylistLeftPanel />
        <PlaylistRightPanel />
      </div>
    </div>
  );
}
