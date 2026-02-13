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
  userQueueIndex: number; // 현재 재생 위치 (-1: 큐에서 재생 중 아님)
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

      // 마이그레이션: 기존 playlist/playHistory → userQueue (index 모델)
      if (data.playlist && !data.userQueue) {
        const wasRadioMode = data.isRadioMode === true;
        return {
          userQueue: wasRadioMode ? [] : (data.playlist || []).map(deserializeSong).filter(Boolean) as Song[],
          userQueueIndex: -1,
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

      // 마이그레이션: userQueueHistory → userQueueIndex
      if (data.userQueueHistory && data.userQueueIndex === undefined) {
        const history = (data.userQueueHistory || []).map(deserializeSong).filter(Boolean) as Song[];
        const queue = (data.userQueue || []).map(deserializeSong).filter(Boolean) as Song[];
        const currentSong = deserializeSong(data.currentSong);
        // history + currentSong + queue 순서로 병합
        const fullQueue = [...history, ...(currentSong ? [currentSong] : []), ...queue];
        const currentIndex = currentSong ? history.length : -1;
        return {
          userQueue: fullQueue,
          userQueueIndex: currentIndex,
          userQueueSource: data.userQueueSource || 'Queue',
          radioQueue: (data.radioQueue || []).map(deserializeSong).filter(Boolean) as Song[],
          radioHistory: (data.radioHistory || []).map(deserializeSong).filter(Boolean) as Song[],
          radioPlayedIds: data.radioPlayedIds || [],
          activeSource: data.activeSource || 'user',
          radioChannel: data.radioChannel || null,
          currentSong,
          isShuffleEnabled: data.isShuffleEnabled || false,
          repeatMode: data.repeatMode || 'off',
        };
      }

      // 현재 구조로 직접 로드
      return {
        userQueue: (data.userQueue || []).map(deserializeSong).filter(Boolean) as Song[],
        userQueueIndex: data.userQueueIndex ?? -1,
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
    userQueueIndex: -1,
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
  const isRadioFetchingRef = useRef(false);

  // Session Storage에 재생목록 자동 저장 (새 구조)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const dataToSave = {
        // User Queue
        userQueue: state.userQueue.map(serializeSong),
        userQueueIndex: state.userQueueIndex,
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
    state.userQueueIndex,
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
      // 곡이 실제로 속한 큐 판별
      const userQueueIdx = prev.userQueue.findIndex(s => s.vocadbId === song.vocadbId);
      const isInRadioQueue = prev.radioQueue.some(s => s.vocadbId === song.vocadbId);

      const songSource = userQueueIdx >= 0 ? 'user' : isInRadioQueue ? 'radio' : prev.activeSource;

      let newUserQueueIndex = prev.userQueueIndex;
      let newRadioQueue = prev.radioQueue;
      let newRadioHistory = prev.radioHistory;

      if (songSource === 'user') {
        // User Queue: 제거하지 않고 인덱스만 이동
        newUserQueueIndex = userQueueIdx;
      } else if (songSource === 'radio') {
        // Radio Queue: 기존 소비 모델 유지
        newRadioQueue = prev.radioQueue.filter(s => s.vocadbId !== song.vocadbId);
        if (prev.currentSong && prev.currentSong.vocadbId !== song.vocadbId) {
          newRadioHistory = [...newRadioHistory.filter(s => s.vocadbId !== prev.currentSong!.vocadbId), prev.currentSong];
        }
      } else {
        // 어느 큐에도 없는 곡 (검색 결과 등) → 큐 위치 유지 안 함
        newUserQueueIndex = -1;
      }

      return {
        ...prev,
        currentSong: song,
        activeSource: songSource,
        userQueueIndex: newUserQueueIndex,
        radioQueue: newRadioQueue,
        radioHistory: newRadioHistory,
        isPlaying: false,
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
    setState(prev => {
      const removeIdx = prev.userQueue.findIndex(song => song.vocadbId === vocadbId);
      if (removeIdx === -1) return prev;

      const newQueue = prev.userQueue.filter(song => song.vocadbId !== vocadbId);
      let newIndex = prev.userQueueIndex;

      if (removeIdx < prev.userQueueIndex) {
        // 현재 곡 앞의 곡 제거 → 인덱스 1 감소
        newIndex--;
      } else if (removeIdx === prev.userQueueIndex) {
        // 현재 재생 곡 제거 → 같은 인덱스에서 다음 곡 재생
        if (newQueue.length === 0) {
          return { ...prev, userQueue: [], userQueueIndex: -1, currentSong: null, isPlaying: false };
        }
        newIndex = Math.min(removeIdx, newQueue.length - 1);
        return { ...prev, userQueue: newQueue, userQueueIndex: newIndex, currentSong: newQueue[newIndex], currentTime: 0 };
      }

      return { ...prev, userQueue: newQueue, userQueueIndex: newIndex };
    });
  }, []);

  const reorderPlaylist = useCallback((oldIndex: number, newIndex: number) => {
    setState(prev => {
      const newUserQueue = [...prev.userQueue];
      const [movedItem] = newUserQueue.splice(oldIndex, 1);
      newUserQueue.splice(newIndex, 0, movedItem);

      // 현재 재생 위치가 영향 받으면 인덱스 보정
      let newQueueIndex = prev.userQueueIndex;
      if (prev.userQueueIndex >= 0) {
        if (oldIndex === prev.userQueueIndex) {
          newQueueIndex = newIndex;
        } else if (oldIndex < prev.userQueueIndex && newIndex >= prev.userQueueIndex) {
          newQueueIndex--;
        } else if (oldIndex > prev.userQueueIndex && newIndex <= prev.userQueueIndex) {
          newQueueIndex++;
        }
      }

      return { ...prev, userQueue: newUserQueue, userQueueIndex: newQueueIndex };
    });
  }, []);

  const clearPlaylist = useCallback(() => {
    setState(prev => ({ ...prev, userQueue: [], userQueueIndex: -1 }));
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
      // 큐에서 이어서 재생할 위치 결정
      const resumeIndex = prev.userQueueIndex >= 0 && prev.userQueueIndex < prev.userQueue.length
        ? prev.userQueueIndex
        : prev.userQueue.length > 0 ? 0 : -1;

      return {
        ...prev,
        radioQueue: [],
        radioHistory: [],
        radioPlayedIds: [],
        radioChannel: null,
        activeSource: 'user',
        activeTab: 'queue',
        currentSong: resumeIndex >= 0 ? prev.userQueue[resumeIndex] : prev.currentSong,
        userQueueIndex: resumeIndex,
      };
    });
  }, []);

  // Radio 중 User Queue로 전환하는 함수
  const switchToUserQueue = useCallback(() => {
    setState(prev => {
      if (prev.activeSource === 'user') return prev;

      if (prev.userQueue.length === 0) {
        return { ...prev, activeTab: 'queue' };
      }

      // 큐에서 이어서 재생할 위치 결정
      const resumeIndex = prev.userQueueIndex >= 0 && prev.userQueueIndex < prev.userQueue.length
        ? prev.userQueueIndex
        : 0;

      // 현재 라디오 곡을 라디오 히스토리에 추가
      let newRadioHistory = prev.radioHistory;
      if (prev.currentSong) {
        newRadioHistory = [...newRadioHistory, prev.currentSong];
      }

      return {
        ...prev,
        activeSource: 'user',
        activeTab: 'queue',
        currentSong: prev.userQueue[resumeIndex],
        userQueueIndex: resumeIndex,
        radioHistory: newRadioHistory,
      };
    });
  }, []);

  const playNextInQueue = useCallback(() => {
    setState(prev => {
      // Repeat one song
      if (prev.repeatMode === 'one' && prev.currentSong) {
        if (playerRef.current) {
          playerRef.current.seekTo(0);
          playerRef.current.playVideo();
        }
        return { ...prev, currentTime: 0 };
      }

      // === User Queue: 인덱스 기반 ===
      if (prev.activeSource === 'user') {
        // 큐가 비어있거나 큐 밖에서 재생 중일 때
        if (prev.userQueue.length === 0) {
          return { ...prev, isPlaying: false };
        }

        // 큐 밖에서 재생 중이면 (검색 결과 등) 큐 처음부터
        if (prev.userQueueIndex < 0) {
          return {
            ...prev,
            userQueueIndex: 0,
            currentSong: prev.userQueue[0],
            currentTime: 0,
          };
        }

        const upcomingCount = prev.userQueue.length - (prev.userQueueIndex + 1);

        if (upcomingCount === 0) {
          // 큐 끝 도달
          if (prev.repeatMode === 'all') {
            return { ...prev, userQueueIndex: 0, currentSong: prev.userQueue[0], currentTime: 0 };
          }
          return { ...prev, isPlaying: false };
        }

        // Shuffle: 남은 곡 중 랜덤 선택 후 다음 위치로 swap
        let nextIndex = prev.userQueueIndex + 1;
        if (prev.isShuffleEnabled && upcomingCount > 1) {
          const randomOffset = Math.floor(Math.random() * upcomingCount);
          const swapIndex = nextIndex + randomOffset;
          const newQueue = [...prev.userQueue];
          [newQueue[nextIndex], newQueue[swapIndex]] = [newQueue[swapIndex], newQueue[nextIndex]];
          return {
            ...prev,
            userQueue: newQueue,
            userQueueIndex: nextIndex,
            currentSong: newQueue[nextIndex],
            currentTime: 0,
          };
        }

        return {
          ...prev,
          userQueueIndex: nextIndex,
          currentSong: prev.userQueue[nextIndex],
          currentTime: 0,
        };
      }

      // === Radio Queue: 기존 소비 모델 유지 ===
      const radioQueue = prev.radioQueue;
      const radioHistory = prev.radioHistory;

      if (radioQueue.length === 0) {
        if (prev.repeatMode === 'all' && prev.currentSong) {
          const allSongs = [...radioHistory, prev.currentSong];
          return {
            ...prev,
            radioQueue: allSongs.slice(1),
            currentSong: allSongs[0],
            radioHistory: [],
            currentTime: 0,
          };
        }
        // Fetch more songs (handled by useEffect)
        return prev;
      }

      let nextSongIndex = 0;
      if (prev.isShuffleEnabled && radioQueue.length > 1) {
        nextSongIndex = Math.floor(Math.random() * radioQueue.length);
      }

      const nextSong = radioQueue[nextSongIndex];
      const remainingQueue = radioQueue.filter((_, idx) => idx !== nextSongIndex);

      let newHistory = radioHistory;
      if (prev.currentSong) {
        newHistory = [...newHistory, prev.currentSong];
      }

      return {
        ...prev,
        currentSong: nextSong,
        radioQueue: remainingQueue,
        radioHistory: newHistory,
        radioPlayedIds: [...prev.radioPlayedIds, nextSong.vocadbId].slice(-50),
        currentTime: 0,
      };
    });
  }, []);

  // Fetch more radio songs when queue is low
  useEffect(() => {
    const fetchMoreRadioSongs = async () => {
      // Radio 모드이고 채널이 있을 때만 실행
      if (state.activeSource !== 'radio' || !state.radioChannel) return;
      if (state.radioQueue.length > 5) return; // Still have enough songs

      // fetch 중복 방지
      if (isRadioFetchingRef.current) return;
      isRadioFetchingRef.current = true;

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
        } else if (data.success && data.playlist.length === 0 && state.radioPlayedIds.length > 0) {
          // excludeIds가 너무 많아서 결과가 없는 경우 → ID 리셋 후 재시도
          console.log('[Radio] Empty results, clearing played IDs for refetch');
          setState(prev => ({ ...prev, radioPlayedIds: [] }));
          // radioPlayedIds 변경으로 다음 렌더에서 useEffect가 다시 트리거됨
        }
      } catch (error) {
        console.error('Failed to fetch more radio songs:', error);
      } finally {
        isRadioFetchingRef.current = false;
      }
    };

    fetchMoreRadioSongs();
  }, [state.activeSource, state.radioQueue.length, state.radioChannel, convertApiSongToSong]);

  const playPrevious = useCallback(() => {
    setState(prev => {
      if (!prev.currentSong) return prev;

      // 3초 이상 재생됐으면 현재 곡 처음으로
      if (prev.currentTime > 3) {
        if (playerRef.current) {
          playerRef.current.seekTo(0);
          playerRef.current.playVideo();
        }
        return { ...prev, currentTime: 0 };
      }

      // === User Queue: 인덱스 기반 ===
      if (prev.activeSource === 'user') {
        if (prev.userQueueIndex <= 0) {
          // 첫 곡이거나 큐 밖 → 현재 곡 처음으로
          if (playerRef.current) {
            playerRef.current.seekTo(0);
            playerRef.current.playVideo();
          }
          return { ...prev, currentTime: 0 };
        }
        const prevIndex = prev.userQueueIndex - 1;
        return {
          ...prev,
          userQueueIndex: prevIndex,
          currentSong: prev.userQueue[prevIndex],
          currentTime: 0,
        };
      }

      // === Radio: 기존 히스토리 기반 ===
      if (prev.radioHistory.length === 0) {
        if (playerRef.current) {
          playerRef.current.seekTo(0);
          playerRef.current.playVideo();
        }
        return { ...prev, currentTime: 0 };
      }

      const previousSong = prev.radioHistory[prev.radioHistory.length - 1];
      const newRadioQueue = [prev.currentSong, ...prev.radioQueue];
      return {
        ...prev,
        currentSong: previousSong,
        radioQueue: newRadioQueue,
        radioHistory: prev.radioHistory.slice(0, -1),
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
