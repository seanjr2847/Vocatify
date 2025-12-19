"use client";

import React from 'react';
import { useMusicPlayer } from '@/lib/MusicPlayerContext';
import { PlaylistLeftPanel } from './PlaylistLeftPanel';
import { PlaylistRightPanel } from './PlaylistRightPanel';

export function FullscreenPlaylistView() {
  const { state } = useMusicPlayer();

  if (state.viewMode !== 'fullscreen') return null;

  return (
    <div
      className="fixed inset-0 top-0 left-0 right-0 bg-[#121212] z-40"
      style={{ height: 'calc(100vh - 125px)' }}
    >
      <div className="grid grid-cols-[500px_1fr] h-full">
        <PlaylistLeftPanel />
        <PlaylistRightPanel />
      </div>
    </div>
  );
}
