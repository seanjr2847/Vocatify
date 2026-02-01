"use client";

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
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
  // Playback controls
  isShuffleEnabled: boolean;
  repeatMode: 'off' | 'all' | 'one'; // off: 반복 없음, all: 전체 반복, one: 한 곡 반복
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
  // Playback controls
  playPrevious: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextValue | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  // BigInt를 string으로 변환 (JSON 직렬화용)
  const serializeSong = (song: Song | null): Song | null => {
    if (!song) return null;
    return {
      ...song,
      viewCount: song.viewCount ? song.viewCount.toString() as unknown as bigint : null,
    };
  };

  // string을 BigInt로 변환 (JSON 역직렬화용)
  const deserializeSong = (song: Song | null): Song | null => {
    if (!song) return null;
    return {
      ...song,
      viewCount: song.viewCount ? BigInt(song.viewCount as unknown as string) : null,
    };
  };

  // Session Storage에서 재생목록 복원
  const loadPlaylistFromSession = (): Partial<PlayerState> => {
    if (typeof window === 'undefined') return {};

    try {
      const stored = sessionStorage.getItem('vocatify_playlist');
      if (!stored) return {};

      const data = JSON.parse(stored);
      return {
        playlist: (data.playlist || []).map(deserializeSong).filter(Boolean) as Song[],
        playlistSource: data.playlistSource || 'Queue',
        currentSong: deserializeSong(data.currentSong),
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
    // Playback controls
    isShuffleEnabled: false,
    repeatMode: 'off',
    ...loadPlaylistFromSession(), // Session Storage에서 복원
  }));

  const playerRef = useRef<YouTubePlayerType | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Session Storage에 재생목록 자동 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const dataToSave = {
        playlist: state.playlist.map(serializeSong),
        playlistSource: state.playlistSource,
        currentSong: serializeSong(state.currentSong),
        isRadioMode: state.isRadioMode,
        radioChannel: state.radioChannel,
        radioTags: state.radioTags,
        radioPlayedIds: state.radioPlayedIds.slice(-100), // 최근 100개만 유지
        isShuffleEnabled: state.isShuffleEnabled,
        repeatMode: state.repeatMode,
      };
      sessionStorage.setItem('vocatify_playlist', JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Failed to save playlist to session storage:', error);
    }
  }, [
    state.playlist,
    state.playlistSource,
    state.currentSong,
    state.isRadioMode,
    state.radioChannel,
    state.radioTags,
    state.radioPlayedIds,
    state.isShuffleEnabled,
    state.repeatMode
  ]);

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
    // Don't play if no YouTube ID available (null or undefined only, not empty string)
    if (song.youtubeId == null) {
      console.warn('Cannot play song without YouTube ID:', song.defaultName);
      return;
    }

    setState(prev => {
      // Remove the song we're about to play from playlist (if exists)
      let newPlaylist = prev.playlist.filter(s => s.vocadbId !== song.vocadbId);

      // Add current song to the END of playlist (for history/previous)
      if (prev.currentSong && prev.currentSong.vocadbId !== song.vocadbId) {
        // Remove current song if already in playlist to avoid duplicates
        newPlaylist = newPlaylist.filter(s => s.vocadbId !== prev.currentSong!.vocadbId);
        // Add to end for playPrevious functionality
        newPlaylist = [...newPlaylist, prev.currentSong];
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
    const title = song.titleKorean ?? song.titleEnglish ?? song.defaultName;

    setState(prev => {
      // 이미 재생목록에 있는지 확인
      const existsInPlaylist = prev.playlist.some(s => s.vocadbId === song.vocadbId);
      // 현재 재생 중인 곡인지 확인
      const isCurrentSong = prev.currentSong?.vocadbId === song.vocadbId;

      if (existsInPlaylist || isCurrentSong) {
        setTimeout(() => toast.info('이미 재생목록에 있는 곡입니다'), 0);
        return prev;
      }

      setTimeout(() => toast.success(`"${title}" 재생목록에 추가되었습니다`), 0);
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
      // Repeat one song
      if (prev.repeatMode === 'one' && prev.currentSong) {
        // Replay current song
        if (playerRef.current) {
          playerRef.current.seekTo(0);
          playerRef.current.playVideo();
        }
        return { ...prev, currentTime: 0 };
      }

      if (prev.playlist.length === 0) {
        // No more songs in queue
        if (prev.repeatMode === 'all' && prev.currentSong) {
          // Add current song back to playlist to continue loop
          return {
            ...prev,
            playlist: [prev.currentSong],
          };
        }
        if (prev.isRadioMode) {
          // Fetch more songs for radio mode (will be handled by useEffect)
          return prev;
        }
        return { ...prev, isPlaying: false };
      }

      // Shuffle: pick a random song from playlist
      let nextSongIndex = 0;
      if (prev.isShuffleEnabled && prev.playlist.length > 1) {
        nextSongIndex = Math.floor(Math.random() * prev.playlist.length);
      }

      const nextSong = prev.playlist[nextSongIndex];
      const remainingPlaylist = prev.playlist.filter((_, idx) => idx !== nextSongIndex);

      // Keep current song in playlist (at the end) for history
      // But in radio mode, don't keep to prevent infinite queue growth
      let newPlaylist = remainingPlaylist;
      if (prev.currentSong && !prev.isRadioMode) {
        newPlaylist = [...remainingPlaylist, prev.currentSong];
      }

      return {
        ...prev,
        currentSong: nextSong,
        playlist: newPlaylist,
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

          setState(prev => {
            // Filter out any songs already in playlist or currently playing
            const existingIds = new Set([
              ...prev.playlist.map(s => s.vocadbId),
              prev.currentSong?.vocadbId,
            ].filter(Boolean));

            const uniqueNewSongs = newSongs.filter(s => !existingIds.has(s.vocadbId));

            return {
              ...prev,
              playlist: [...prev.playlist, ...uniqueNewSongs],
            };
          });
        }
      } catch (error) {
        console.error('Failed to fetch more radio songs:', error);
      }
    };

    fetchMoreRadioSongs();
  }, [state.isRadioMode, state.playlist.length, state.radioChannel, state.radioPlayedIds, convertApiSongToSong]);

  const playPrevious = useCallback(() => {
    setState(prev => {
      // If there's no current song, do nothing
      if (!prev.currentSong) return prev;

      // If we're more than 3 seconds into the song, restart it
      if (prev.currentTime > 3) {
        if (playerRef.current) {
          playerRef.current.seekTo(0);
          playerRef.current.playVideo();
        }
        return { ...prev, currentTime: 0 };
      }

      // Otherwise, play the last song from the playlist
      if (prev.playlist.length === 0) {
        // No previous song, just restart current
        if (playerRef.current) {
          playerRef.current.seekTo(0);
          playerRef.current.playVideo();
        }
        return { ...prev, currentTime: 0 };
      }

      // Get the last song from playlist (most recently played)
      const previousSong = prev.playlist[prev.playlist.length - 1];
      const newPlaylist = prev.playlist.slice(0, -1);

      // Add current song to the beginning of playlist (it will be "next")
      // Check for duplicates first
      const filteredPlaylist = newPlaylist.filter(s => s.vocadbId !== prev.currentSong!.vocadbId);
      const updatedPlaylist = [prev.currentSong, ...filteredPlaylist];

      return {
        ...prev,
        currentSong: previousSong,
        playlist: updatedPlaylist,
        currentTime: 0,
      };
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setState(prev => ({
      ...prev,
      isShuffleEnabled: !prev.isShuffleEnabled,
    }));
  }, []);

  const toggleRepeat = useCallback(() => {
    setState(prev => {
      const modes: Array<'off' | 'all' | 'one'> = ['off', 'all', 'one'];
      const currentIndex = modes.indexOf(prev.repeatMode);
      const nextMode = modes[(currentIndex + 1) % modes.length];

      return {
        ...prev,
        repeatMode: nextMode,
      };
    });
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
    reorderPlaylist,
    clearPlaylist,
    updateDuration,
    updatePlayingState,
    playerRef,
    // Radio mode
    startRadio,
    stopRadio,
    playNextInQueue,
    // Playback controls
    playPrevious,
    toggleShuffle,
    toggleRepeat,
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
