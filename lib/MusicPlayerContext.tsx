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
  activeTab: 'queue' | 'radio' | 'lyrics'; // 확장: 3개 탭

  // User Queue (독립 - 라디오 상태와 무관하게 보존)
  userQueue: Song[];
  userQueueHistory: Song[];
  userQueueSource: string; // "PLAYING FROM:" 표시용

  // Radio Queue (독립)
  radioQueue: Song[];
  radioHistory: Song[];
  radioPlayedIds: number[]; // 이미 재생된 곡 ID들

  // Source Management
  activeSource: 'user' | 'radio';
  radioChannel: { slug: string; name: string; seedSongId?: number } | null; // 현재 라디오 채널

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
  setActiveTab: (tab: 'queue' | 'radio' | 'lyrics') => void;
  addToPlaylist: (song: Song) => void;
  removeFromPlaylist: (vocadbId: number) => void;
  reorderPlaylist: (oldIndex: number, newIndex: number) => void;
  clearPlaylist: () => void;
  updateDuration: (duration: number) => void;
  updatePlayingState: (isPlaying: boolean) => void;
  playerRef: React.MutableRefObject<YouTubePlayerType | null>;
  // Radio mode
  startRadio: (channelSlug: string) => Promise<void>;
  startSimilarRadio: (songId: number) => Promise<void>;
  stopRadio: () => void;
  playNextInQueue: () => void;
  // Source switching
  switchToUserQueue: () => void;
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

  // Session Storage에서 재생목록 복원 (마이그레이션 지원)
  const loadPlaylistFromSession = (): Partial<PlayerState> => {
    if (typeof window === 'undefined') return {};

    try {
      const stored = sessionStorage.getItem('vocatify_playlist');
      if (!stored) return {};

      const data = JSON.parse(stored);

      // 마이그레이션: 기존 playlist/playHistory → userQueue/userQueueHistory
      if (data.playlist && !data.userQueue) {
        // 기존 구조에서 새 구조로 마이그레이션
        const wasRadioMode = data.isRadioMode === true;
        return {
          userQueue: wasRadioMode ? [] : (data.playlist || []).map(deserializeSong).filter(Boolean) as Song[],
          userQueueHistory: wasRadioMode ? [] : (data.playHistory || []).map(deserializeSong).filter(Boolean) as Song[],
          userQueueSource: data.playlistSource || 'Queue',
          radioQueue: wasRadioMode ? (data.playlist || []).map(deserializeSong).filter(Boolean) as Song[] : [],
          radioHistory: wasRadioMode ? (data.playHistory || []).map(deserializeSong).filter(Boolean) as Song[] : [],
          radioPlayedIds: data.radioPlayedIds || [],
          activeSource: wasRadioMode ? 'radio' : 'user',
          radioChannel: data.radioChannel || null,
          currentSong: deserializeSong(data.currentSong),
          isShuffleEnabled: data.isShuffleEnabled || false,
          repeatMode: data.repeatMode || 'off',
        };
      }

      // 새 구조로 직접 로드
      return {
        userQueue: (data.userQueue || []).map(deserializeSong).filter(Boolean) as Song[],
        userQueueHistory: (data.userQueueHistory || []).map(deserializeSong).filter(Boolean) as Song[],
        userQueueSource: data.userQueueSource || 'Queue',
        radioQueue: (data.radioQueue || []).map(deserializeSong).filter(Boolean) as Song[],
        radioHistory: (data.radioHistory || []).map(deserializeSong).filter(Boolean) as Song[],
        radioPlayedIds: data.radioPlayedIds || [],
        activeSource: data.activeSource || 'user',
        radioChannel: data.radioChannel || null,
        currentSong: deserializeSong(data.currentSong),
        isShuffleEnabled: data.isShuffleEnabled || false,
        repeatMode: data.repeatMode || 'off',
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

    // User Queue (독립)
    userQueue: [],
    userQueueHistory: [],
    userQueueSource: 'Queue',

    // Radio Queue (독립)
    radioQueue: [],
    radioHistory: [],
    radioPlayedIds: [],

    // Source Management
    activeSource: 'user',
    radioChannel: null,

    // Playback controls
    isShuffleEnabled: false,
    repeatMode: 'off',
    ...loadPlaylistFromSession(), // Session Storage에서 복원
  }));

  const playerRef = useRef<YouTubePlayerType | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Session Storage에 재생목록 자동 저장 (새 구조)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const dataToSave = {
        // User Queue
        userQueue: state.userQueue.map(serializeSong),
        userQueueHistory: state.userQueueHistory.slice(-50).map(serializeSong), // 최근 50개만 유지
        userQueueSource: state.userQueueSource,
        // Radio Queue
        radioQueue: state.radioQueue.map(serializeSong),
        radioHistory: state.radioHistory.slice(-50).map(serializeSong),
        radioPlayedIds: state.radioPlayedIds.slice(-100), // 최근 100개만 유지
        // Source Management
        activeSource: state.activeSource,
        radioChannel: state.radioChannel,
        // Current Song
        currentSong: serializeSong(state.currentSong),
        // Playback controls
        isShuffleEnabled: state.isShuffleEnabled,
        repeatMode: state.repeatMode,
      };
      sessionStorage.setItem('vocatify_playlist', JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Failed to save playlist to session storage:', error);
    }
  }, [
    state.userQueue,
    state.userQueueHistory,
    state.userQueueSource,
    state.radioQueue,
    state.radioHistory,
    state.radioPlayedIds,
    state.activeSource,
    state.radioChannel,
    state.currentSong,
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
      // activeSource에 따라 적절한 Queue에서 곡 제거 및 History에 추가
      let newUserQueue = prev.userQueue;
      let newUserHistory = prev.userQueueHistory;
      let newRadioQueue = prev.radioQueue;
      let newRadioHistory = prev.radioHistory;

      if (prev.activeSource === 'user') {
        // User Queue에서 곡 제거
        newUserQueue = prev.userQueue.filter(s => s.vocadbId !== song.vocadbId);
        // 현재 곡을 User History에 추가
        if (prev.currentSong && prev.currentSong.vocadbId !== song.vocadbId) {
          newUserHistory = newUserHistory.filter(s => s.vocadbId !== prev.currentSong!.vocadbId);
          newUserHistory = [...newUserHistory, prev.currentSong];
        }
      } else {
        // Radio Queue에서 곡 제거
        newRadioQueue = prev.radioQueue.filter(s => s.vocadbId !== song.vocadbId);
        // 현재 곡을 Radio History에 추가
        if (prev.currentSong && prev.currentSong.vocadbId !== song.vocadbId) {
          newRadioHistory = newRadioHistory.filter(s => s.vocadbId !== prev.currentSong!.vocadbId);
          newRadioHistory = [...newRadioHistory, prev.currentSong];
        }
      }

      return {
        ...prev,
        currentSong: song,
        userQueue: newUserQueue,
        userQueueHistory: newUserHistory,
        radioQueue: newRadioQueue,
        radioHistory: newRadioHistory,
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

  const setActiveTab = useCallback((tab: 'queue' | 'radio' | 'lyrics') => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  const addToPlaylist = useCallback((song: Song) => {
    const title = song.titleKorean ?? song.titleEnglish ?? song.defaultName;

    setState(prev => {
      // 항상 userQueue에만 추가 (Radio 상태와 무관)
      const existsInUserQueue = prev.userQueue.some(s => s.vocadbId === song.vocadbId);
      // 현재 재생 중인 곡인지 확인 (User 모드일 때만)
      const isCurrentSong = prev.activeSource === 'user' && prev.currentSong?.vocadbId === song.vocadbId;

      if (existsInUserQueue || isCurrentSong) {
        setTimeout(() => toast.info('이미 재생목록에 있는 곡입니다'), 0);
        return prev;
      }

      setTimeout(() => toast.success(`"${title}" 재생목록에 추가되었습니다`), 0);
      return {
        ...prev,
        userQueue: [...prev.userQueue, song],
      };
    });
  }, []);

  const removeFromPlaylist = useCallback((vocadbId: number) => {
    // userQueue에서만 제거
    setState(prev => ({
      ...prev,
      userQueue: prev.userQueue.filter(song => song.vocadbId !== vocadbId),
    }));
  }, []);

  const reorderPlaylist = useCallback((oldIndex: number, newIndex: number) => {
    // userQueue만 대상으로 정렬
    setState(prev => {
      const newUserQueue = [...prev.userQueue];
      const [movedItem] = newUserQueue.splice(oldIndex, 1);
      newUserQueue.splice(newIndex, 0, movedItem);
      return { ...prev, userQueue: newUserQueue };
    });
  }, []);

  const clearPlaylist = useCallback(() => {
    // userQueue만 초기화
    setState(prev => ({ ...prev, userQueue: [], userQueueHistory: [] }));
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
        // userQueue는 보존! (핵심)
        // userQueueHistory도 보존!
        // Radio 상태만 설정
        radioQueue: playlist.map(convertApiSongToSong),
        radioHistory: [], // Reset radio history when starting
        radioPlayedIds: [seedSong.vocadbId],
        // Source 전환
        activeSource: 'radio',
        radioChannel: channel,
        // Tab 전환
        activeTab: 'radio',
        // 재생 상태
        isPlaying: false, // YouTube onStateChange will set to true
        currentTime: 0,
        viewMode: 'fullscreen',
      }));

    } catch (error) {
      console.error('Radio start error:', error);
    }
  }, [convertApiSongToSong]);

  // Start similar songs radio based on a seed song
  const startSimilarRadio = useCallback(async (songId: number) => {
    try {
      const response = await fetch(`/api/radio/similar?songId=${songId}`);
      const data = await response.json();

      if (!data.success) {
        console.error('Failed to start similar radio:', data.error);
        return;
      }

      const { seedSong, playlist } = data;
      const displayTitle = seedSong.titleKorean || seedSong.titleEnglish || seedSong.defaultName;

      setState(prev => ({
        ...prev,
        currentSong: convertApiSongToSong(seedSong),
        // userQueue는 보존! (핵심)
        // Radio 상태만 설정
        radioQueue: playlist.map(convertApiSongToSong),
        radioHistory: [], // Reset radio history when starting
        radioPlayedIds: [seedSong.vocadbId],
        // Source 전환
        activeSource: 'radio',
        radioChannel: { slug: 'similar', name: `${displayTitle} 라디오`, seedSongId: seedSong.vocadbId },
        // Tab 전환
        activeTab: 'radio',
        // 재생 상태
        isPlaying: false,
        currentTime: 0,
        viewMode: 'fullscreen',
      }));

    } catch (error) {
      console.error('Similar radio start error:', error);
    }
  }, [convertApiSongToSong]);

  const stopRadio = useCallback(() => {
    setState(prev => {
      // User Queue에 곡이 있으면 첫 번째 곡 재생
      const firstUserSong = prev.userQueue[0];

      return {
        ...prev,
        // Radio 상태 초기화
        radioQueue: [],
        radioHistory: [],
        radioPlayedIds: [],
        radioChannel: null,
        // Source 전환
        activeSource: 'user',
        activeTab: 'queue',
        // User Queue에 곡이 있으면 재생
        currentSong: firstUserSong || prev.currentSong,
        userQueue: firstUserSong ? prev.userQueue.slice(1) : prev.userQueue,
      };
    });
  }, []);

  // Radio 중 User Queue로 전환하는 함수
  const switchToUserQueue = useCallback(() => {
    setState(prev => {
      if (prev.activeSource === 'user') return prev; // 이미 User 모드

      // User Queue에 곡이 있으면 첫 번째 곡 재생
      const firstUserSong = prev.userQueue[0];

      if (!firstUserSong) {
        // User Queue가 비어있으면 탭만 전환
        return {
          ...prev,
          activeTab: 'queue',
        };
      }

      // 현재 라디오 곡을 라디오 히스토리에 추가
      let newRadioHistory = prev.radioHistory;
      if (prev.currentSong) {
        newRadioHistory = [...newRadioHistory, prev.currentSong];
      }

      return {
        ...prev,
        // Source 전환
        activeSource: 'user',
        activeTab: 'queue',
        // User Queue에서 재생
        currentSong: firstUserSong,
        userQueue: prev.userQueue.slice(1),
        // Radio 상태 유지 (나중에 돌아올 수 있도록)
        radioHistory: newRadioHistory,
      };
    });
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

      // activeSource에 따라 적절한 Queue 선택
      const currentQueue = prev.activeSource === 'user' ? prev.userQueue : prev.radioQueue;
      const currentHistory = prev.activeSource === 'user' ? prev.userQueueHistory : prev.radioHistory;

      if (currentQueue.length === 0) {
        // No more songs in current queue
        if (prev.repeatMode === 'all' && prev.currentSong) {
          // Repeat all: move all history back to queue and continue
          const allSongs = [...currentHistory, prev.currentSong];
          if (prev.activeSource === 'user') {
            return {
              ...prev,
              userQueue: allSongs.slice(1),
              currentSong: allSongs[0],
              userQueueHistory: [],
              currentTime: 0,
            };
          } else {
            return {
              ...prev,
              radioQueue: allSongs.slice(1),
              currentSong: allSongs[0],
              radioHistory: [],
              currentTime: 0,
            };
          }
        }
        if (prev.activeSource === 'radio') {
          // Fetch more songs for radio mode (will be handled by useEffect)
          return prev;
        }
        return { ...prev, isPlaying: false };
      }

      // Shuffle: pick a random song from queue
      let nextSongIndex = 0;
      if (prev.isShuffleEnabled && currentQueue.length > 1) {
        nextSongIndex = Math.floor(Math.random() * currentQueue.length);
      }

      const nextSong = currentQueue[nextSongIndex];
      const remainingQueue = currentQueue.filter((_, idx) => idx !== nextSongIndex);

      // Add current song to history
      let newHistory = currentHistory;
      if (prev.currentSong) {
        newHistory = [...newHistory, prev.currentSong];
      }

      if (prev.activeSource === 'user') {
        return {
          ...prev,
          currentSong: nextSong,
          userQueue: remainingQueue,
          userQueueHistory: newHistory,
          currentTime: 0,
        };
      } else {
        return {
          ...prev,
          currentSong: nextSong,
          radioQueue: remainingQueue,
          radioHistory: newHistory,
          radioPlayedIds: [...prev.radioPlayedIds, nextSong.vocadbId],
          currentTime: 0,
        };
      }
    });
  }, []);

  // Fetch more radio songs when queue is low
  useEffect(() => {
    const fetchMoreRadioSongs = async () => {
      // Radio 모드이고 채널이 있을 때만 실행
      if (state.activeSource !== 'radio' || !state.radioChannel) return;
      if (state.radioQueue.length > 5) return; // Still have enough songs

      try {
        const excludeIds = state.radioPlayedIds.join(',');
        const seedSongParam = state.radioChannel.slug === 'similar' && state.radioChannel.seedSongId
          ? `&seedSongId=${state.radioChannel.seedSongId}`
          : '';

        const response = await fetch(
          `/api/radio/next?channel=${state.radioChannel.slug}&excludeIds=${encodeURIComponent(excludeIds)}&limit=10${seedSongParam}`
        );
        const data = await response.json();

        if (data.success && data.playlist.length > 0) {
          const newSongs: Song[] = data.playlist.map(convertApiSongToSong);

          setState(prev => {
            // Filter out any songs already in radioQueue or currently playing
            const existingIds = new Set([
              ...prev.radioQueue.map(s => s.vocadbId),
              prev.currentSong?.vocadbId,
            ].filter(Boolean));

            const uniqueNewSongs = newSongs.filter(s => !existingIds.has(s.vocadbId));

            return {
              ...prev,
              radioQueue: [...prev.radioQueue, ...uniqueNewSongs],
            };
          });
        }
      } catch (error) {
        console.error('Failed to fetch more radio songs:', error);
      }
    };

    fetchMoreRadioSongs();
  }, [state.activeSource, state.radioQueue.length, state.radioChannel, state.radioPlayedIds, convertApiSongToSong]);

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

      // activeSource에 따라 적절한 History 선택
      const currentHistory = prev.activeSource === 'user' ? prev.userQueueHistory : prev.radioHistory;

      // No previous song in current history, just restart current
      if (currentHistory.length === 0) {
        if (playerRef.current) {
          playerRef.current.seekTo(0);
          playerRef.current.playVideo();
        }
        return { ...prev, currentTime: 0 };
      }

      // Get the last song from history
      const previousSong = currentHistory[currentHistory.length - 1];
      const newHistory = currentHistory.slice(0, -1);

      if (prev.activeSource === 'user') {
        // Add current song to the beginning of userQueue (it will be "next")
        const newUserQueue = [prev.currentSong, ...prev.userQueue];
        return {
          ...prev,
          currentSong: previousSong,
          userQueue: newUserQueue,
          userQueueHistory: newHistory,
          currentTime: 0,
        };
      } else {
        // Add current song to the beginning of radioQueue (it will be "next")
        const newRadioQueue = [prev.currentSong, ...prev.radioQueue];
        return {
          ...prev,
          currentSong: previousSong,
          radioQueue: newRadioQueue,
          radioHistory: newHistory,
          currentTime: 0,
        };
      }
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
    startSimilarRadio,
    stopRadio,
    playNextInQueue,
    // Source switching
    switchToUserQueue,
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
