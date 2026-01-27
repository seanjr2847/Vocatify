"use client";

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { Song } from './db';
import { YouTubePlayer } from '@/components/YouTubePlayer';
import type { YouTubePlayer as YouTubePlayerType } from 'react-youtube';

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
  // Radio mode
  isRadioMode: boolean;
  radioChannel: { slug: string; name: string } | null; // 현재 라디오 채널
  radioTags: string[]; // 라디오 태그 목록
  radioPlayedIds: number[]; // 이미 재생된 곡 ID들
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
  reorderPlaylist: (oldIndex: number, newIndex: number) => void;
  clearPlaylist: () => void;
  updateDuration: (duration: number) => void;
  updatePlayingState: (isPlaying: boolean) => void;
  playerRef: React.MutableRefObject<YouTubePlayerType | null>;
  // Radio mode
  startRadio: (channelSlug: string) => Promise<void>;
  stopRadio: () => void;
  playNextInQueue: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextValue | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  // Session Storage에서 재생목록 복원
  const loadPlaylistFromSession = (): Partial<PlayerState> => {
    if (typeof window === 'undefined') return {};

    try {
      const stored = sessionStorage.getItem('vocatify_playlist');
      if (!stored) return {};

      const data = JSON.parse(stored);
      return {
        playlist: data.playlist || [],
        playlistSource: data.playlistSource || 'Queue',
        currentSong: data.currentSong || null,
      };
    } catch (error) {
      console.error('Failed to load playlist from session storage:', error);
      return {};
    }
  };

  const [state, setState] = useState<PlayerState>(() => ({
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
    // Radio mode
    isRadioMode: false,
    radioChannel: null,
    radioTags: [],
    radioPlayedIds: [],
    ...loadPlaylistFromSession(), // Session Storage에서 복원
  }));

  const playerRef = useRef<YouTubePlayerType | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Session Storage에 재생목록 자동 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const dataToSave = {
        playlist: state.playlist,
        playlistSource: state.playlistSource,
        currentSong: state.currentSong,
        isRadioMode: state.isRadioMode,
        radioChannel: state.radioChannel,
        radioTags: state.radioTags,
        radioPlayedIds: state.radioPlayedIds,
      };
      sessionStorage.setItem('vocatify_playlist', JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Failed to save playlist to session storage:', error);
    }
  }, [state.playlist, state.playlistSource, state.currentSong, state.isRadioMode, state.radioChannel, state.radioTags, state.radioPlayedIds]);

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
    // Don't play if no YouTube ID available
    if (!song.youtubeId) {
      console.warn('Cannot play song without YouTube ID:', song.defaultName);
      return;
    }

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

  const reorderPlaylist = useCallback((oldIndex: number, newIndex: number) => {
    setState(prev => {
      const newPlaylist = [...prev.playlist];
      const [movedItem] = newPlaylist.splice(oldIndex, 1);
      newPlaylist.splice(newIndex, 0, movedItem);
      return { ...prev, playlist: newPlaylist };
    });
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

  // API response type for radio songs
  interface ApiSong {
    vocadbId: number;
    defaultName?: string;
    titleEnglish?: string | null;
    titleJapanese?: string | null;
    titleRomaji?: string | null;
    titleKorean?: string | null;
    artistString?: string;
    youtubeId?: string | null;
    youtubeUrl?: string | null;
    thumbUrl?: string | null;
    viewCount?: string | null;
    lengthSeconds?: number | null;
  }

  // Convert API response to Song type
  const convertApiSongToSong = useCallback((s: ApiSong): Song => ({
    vocadbId: s.vocadbId,
    defaultName: s.defaultName || '',
    titleEnglish: s.titleEnglish || null,
    titleJapanese: s.titleJapanese || null,
    titleRomaji: s.titleRomaji || null,
    titleKorean: s.titleKorean || null,
    artistString: s.artistString || '',
    youtubeId: s.youtubeId || null,
    youtubeUrl: s.youtubeUrl || null,
    thumbUrl: s.thumbUrl || null,
    favoritedTimes: 0,
    ratingScore: 0,
    publishDate: null,
    songType: null,
    viewCount: s.viewCount ? BigInt(s.viewCount) : null,
    viewCountUpdatedAt: null,
  }), []);

  // Radio mode functions
  const startRadio = useCallback(async (channelSlug: string) => {
    try {
      const response = await fetch(`/api/radio/start?channel=${channelSlug}`);
      const data = await response.json();

      if (!data.success) {
        console.error('Failed to start radio:', data.error);
        return;
      }

      const { seedSong, playlist, channel } = data;

      setState(prev => ({
        ...prev,
        currentSong: convertApiSongToSong(seedSong),
        playlist: playlist.map(convertApiSongToSong),
        playlistSource: channel?.name || '라디오',
        isRadioMode: true,
        radioChannel: channel,
        radioTags: [], // No longer using tags
        radioPlayedIds: [seedSong.vocadbId],
        isPlaying: false, // YouTube onStateChange will set to true
        currentTime: 0,
        viewMode: 'fullscreen',
      }));

    } catch (error) {
      console.error('Radio start error:', error);
    }
  }, [convertApiSongToSong]);

  const stopRadio = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRadioMode: false,
      radioChannel: null,
      radioTags: [],
      radioPlayedIds: [],
      playlistSource: 'Queue',
    }));
  }, []);

  const playNextInQueue = useCallback(() => {
    setState(prev => {
      if (prev.playlist.length === 0) {
        // No more songs in queue
        if (prev.isRadioMode) {
          // Fetch more songs for radio mode (will be handled by useEffect)
          return prev;
        }
        return { ...prev, isPlaying: false };
      }

      const [nextSong, ...remainingPlaylist] = prev.playlist;

      return {
        ...prev,
        currentSong: nextSong,
        playlist: remainingPlaylist,
        radioPlayedIds: prev.isRadioMode
          ? [...prev.radioPlayedIds, nextSong.vocadbId]
          : prev.radioPlayedIds,
        currentTime: 0,
      };
    });
  }, []);

  // Fetch more radio songs when queue is low
  useEffect(() => {
    const fetchMoreRadioSongs = async () => {
      if (!state.isRadioMode || !state.radioChannel) return;
      if (state.playlist.length > 5) return; // Still have enough songs

      try {
        const excludeIds = state.radioPlayedIds.join(',');

        const response = await fetch(
          `/api/radio/next?channel=${state.radioChannel.slug}&excludeIds=${encodeURIComponent(excludeIds)}&limit=10`
        );
        const data = await response.json();

        if (data.success && data.playlist.length > 0) {
          const newSongs: Song[] = data.playlist.map(convertApiSongToSong);

          setState(prev => ({
            ...prev,
            playlist: [...prev.playlist, ...newSongs],
          }));
        }
      } catch (error) {
        console.error('Failed to fetch more radio songs:', error);
      }
    };

    fetchMoreRadioSongs();
  }, [state.isRadioMode, state.playlist.length, state.radioChannel, state.radioPlayedIds, convertApiSongToSong]);

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
    reorderPlaylist,
    clearPlaylist,
    updateDuration,
    updatePlayingState,
    playerRef,
    // Radio mode
    startRadio,
    stopRadio,
    playNextInQueue,
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
