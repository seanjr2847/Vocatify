"use client";

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { Song } from './db';
import { YouTubePlayer } from '@/components/YouTubePlayer';

interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  volume: number; // 0-100
  currentTime: number; // seconds
  duration: number; // seconds
  isMuted: boolean;
  viewMode: 'minimized' | 'fullscreen';
  activeTab: 'queue' | 'suggested' | 'lyrics' | 'credits';
  playlist: Song[]; // 재생목록
  playlistSource: string; // "PLAYING FROM:" 표시용
}

interface MusicPlayerContextValue {
  state: PlayerState;
  playSong: (song: Song) => void;
  togglePlay: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setViewMode: (mode: 'minimized' | 'fullscreen') => void;
  toggleFullscreen: () => void;
  setActiveTab: (tab: 'queue' | 'suggested' | 'lyrics' | 'credits') => void;
  addToPlaylist: (song: Song) => void;
  removeFromPlaylist: (vocadbId: number) => void;
  clearPlaylist: () => void;
  updateDuration: (duration: number) => void;
  updatePlayingState: (isPlaying: boolean) => void;
  playerRef: React.MutableRefObject<any>;
}

const MusicPlayerContext = createContext<MusicPlayerContextValue | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlayerState>({
    currentSong: null,
    isPlaying: false,
    volume: 50,
    currentTime: 0,
    duration: 0,
    isMuted: false,
    viewMode: 'minimized', // 기본값: 재생목록 숨김
    activeTab: 'queue', // 기본 탭: Play queue
    playlist: [],
    playlistSource: 'Queue', // 기본 소스
  });

  const playerRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update current time while playing
  useEffect(() => {
    if (state.isPlaying && playerRef.current) {
      intervalRef.current = setInterval(() => {
        if (playerRef.current && playerRef.current.getCurrentTime) {
          const currentTime = playerRef.current.getCurrentTime();
          setState(prev => ({ ...prev, currentTime }));
        }
      }, 100); // 100ms (0.1초)마다 업데이트하여 부드러운 애니메이션
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isPlaying]);

  const playSong = useCallback((song: Song) => {
    setState(prev => {
      // If there's a current song playing, insert it at front of playlist
      let newPlaylist = prev.playlist;

      if (prev.currentSong) {
        // Remove current song from playlist if it exists
        newPlaylist = newPlaylist.filter(s => s.vocadbId !== prev.currentSong!.vocadbId);
        // Insert current song at the front (paused state, ready to play next)
        newPlaylist = [prev.currentSong, ...newPlaylist];
      }

      return {
        ...prev,
        currentSong: song,
        playlist: newPlaylist,
        isPlaying: false, // YouTube의 onStateChange에서 자동으로 true로 설정됨
        currentTime: 0,
      };
    });
  }, []);

  const togglePlay = useCallback(() => {
    if (!state.currentSong) return;
    if (!playerRef.current) return; // 플레이어가 준비되지 않았으면 중단

    if (state.isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
    setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, [state.currentSong, state.isPlaying]);

  const seekTo = useCallback((seconds: number) => {
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(seconds, true);
      setState(prev => ({ ...prev, currentTime: seconds }));
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(100, volume));
    if (playerRef.current && playerRef.current.setVolume) {
      playerRef.current.setVolume(clampedVolume);
    }
    setState(prev => ({ ...prev, volume: clampedVolume, isMuted: clampedVolume === 0 }));
  }, []);

  const toggleMute = useCallback(() => {
    if (playerRef.current) {
      if (state.isMuted) {
        playerRef.current.unMute();
        playerRef.current.setVolume(state.volume);
      } else {
        playerRef.current.mute();
      }
    }
    setState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  }, [state.isMuted, state.volume]);

  const setViewMode = useCallback((mode: 'minimized' | 'fullscreen') => {
    setState(prev => ({ ...prev, viewMode: mode }));
  }, []);

  const toggleFullscreen = useCallback(() => {
    setState(prev => ({
      ...prev,
      viewMode: prev.viewMode === 'minimized' ? 'fullscreen' : 'minimized'
    }));
  }, []);

  const setActiveTab = useCallback((tab: 'queue' | 'suggested' | 'lyrics' | 'credits') => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  const addToPlaylist = useCallback((song: Song) => {
    setState(prev => {
      // 이미 재생목록에 있는지 확인
      const exists = prev.playlist.some(s => s.vocadbId === song.vocadbId);
      if (exists) return prev;

      return {
        ...prev,
        playlist: [...prev.playlist, song],
      };
    });
  }, []);

  const removeFromPlaylist = useCallback((vocadbId: number) => {
    setState(prev => ({
      ...prev,
      playlist: prev.playlist.filter(song => song.vocadbId !== vocadbId),
    }));
  }, []);

  const clearPlaylist = useCallback(() => {
    setState(prev => ({ ...prev, playlist: [] }));
  }, []);

  const updateDuration = useCallback((duration: number) => {
    setState(prev => ({ ...prev, duration }));
  }, []);

  const updatePlayingState = useCallback((isPlaying: boolean) => {
    setState(prev => ({ ...prev, isPlaying }));
  }, []);

  const value: MusicPlayerContextValue = {
    state,
    playSong,
    togglePlay,
    seekTo,
    setVolume,
    toggleMute,
    setViewMode,
    toggleFullscreen,
    setActiveTab,
    addToPlaylist,
    removeFromPlaylist,
    clearPlaylist,
    updateDuration,
    updatePlayingState,
    playerRef,
  };

  return (
    <MusicPlayerContext.Provider value={value}>
      <YouTubePlayer />
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (context === undefined) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
}
