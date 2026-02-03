"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import YouTube, { YouTubeProps, YouTubeEvent } from 'react-youtube';
import { useMusicPlayer } from '@/lib/MusicPlayerContext';
import { getDisplayTitle } from '@/lib/utils/format-utils';

export function YouTubePlayer() {
  const { state, playerRef, updateDuration, updatePlayingState, playNextInQueue, playPrevious } = useMusicPlayer();
  const [isReady, setIsReady] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const lastEndedVideoRef = useRef<string | null>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // viewMode에 따라 다른 설정 적용
  const isFullscreen = state.viewMode === 'fullscreen';

  // YouTube 플레이어 스타일을 메모이제이션 (재생성 방지)
  const youtubePlayerStyle = useMemo(() => ({
    width: '400px',
    height: '400px'
  }), []);

  // opts를 고정하여 플레이어 재생성 방지
  // viewMode 전환 시 opts가 변경되면 플레이어가 재생성되어 playerRef가 null이 됨
  const opts: YouTubeProps['opts'] = {
    height: '400',
    width: '400',
    playerVars: {
      autoplay: 1,
      controls: 1,
      fs: 0,
      modestbranding: 1,
      playsinline: 1,
      rel: 0,
      origin: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  };

  const onReady: YouTubeProps['onReady'] = useCallback((event: YouTubeEvent) => {
    playerRef.current = event.target;
    setIsReady(true);

    // Set initial volume
    if (playerRef.current?.setVolume) {
      playerRef.current.setVolume(state.volume);
    }

    // Get and update duration
    if (playerRef.current?.getDuration) {
      const duration = playerRef.current.getDuration();
      if (duration > 0) {
        updateDuration(duration);
      }
    }
  }, [state.volume, updateDuration, playerRef]);

  const onStateChange: YouTubeProps['onStateChange'] = useCallback((event: YouTubeEvent) => {
    const playerState = event.data;

    // YouTube Player States:
    // -1: unstarted
    // 0: ended
    // 1: playing
    // 2: paused
    // 3: buffering
    // 5: video cued

    // Update duration when video starts playing
    if (playerState === 1 && playerRef.current?.getDuration) {
      const duration = playerRef.current.getDuration();
      if (duration > 0) {
        updateDuration(duration);
      }
    }

    // Update playing state
    if (playerState === 1) {
      updatePlayingState(true);
    } else if (playerState === 2) {
      updatePlayingState(false);
    } else if (playerState === 0) {
      // Video ended - play next song in queue
      updatePlayingState(false);
      playNextInQueue();
    }
  }, [updatePlayingState, updateDuration, playerRef, playNextInQueue]);

  const onError: YouTubeProps['onError'] = useCallback((event: YouTubeEvent) => {
    console.error('YouTube Player Error:', event.data);
    // Error codes:
    // 2: Invalid parameter
    // 5: HTML5 player error
    // 100: Video not found / removed
    // 101, 150: Video not embeddable

    // On error, try to play next song
    if (event.data === 100 || event.data === 101 || event.data === 150) {
      playNextInQueue();
    }
  }, [playNextInQueue]);

  // Silent audio to prevent browser from throttling background tabs
  // This keeps the tab "active" so YouTube events fire properly
  useEffect(() => {
    if (!state.isPlaying) {
      // Stop silent audio when not playing
      if (silentAudioRef.current) {
        silentAudioRef.current.pause();
      }
      return;
    }

    // Create silent audio element if not exists
    if (!silentAudioRef.current) {
      // Create a very short silent audio using data URI (10ms of silence)
      const silentAudio = new Audio(
        'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='
      );
      silentAudio.loop = true;
      silentAudio.volume = 0.01; // Nearly silent
      silentAudioRef.current = silentAudio;
    }

    // Play silent audio to keep tab active
    silentAudioRef.current.play().catch(() => {
      // Autoplay might be blocked, that's okay
    });

    return () => {
      if (silentAudioRef.current) {
        silentAudioRef.current.pause();
      }
    };
  }, [state.isPlaying]);

  // Polling mechanism for background tab support using Web Worker
  // Web Workers are less affected by browser throttling than setInterval
  useEffect(() => {
    if (!isReady || !playerRef.current || !state.currentSong) return;

    const checkPlaybackStatus = () => {
      if (!playerRef.current) return;

      try {
        const playerState = playerRef.current.getPlayerState?.();
        const currentTime = playerRef.current.getCurrentTime?.() || 0;
        const duration = playerRef.current.getDuration?.() || 0;

        // Check if video ended (state 0 or near end of video)
        // Using a 1.5 second threshold to handle background throttling
        if (playerState === 0 || (duration > 0 && currentTime >= duration - 1.5)) {
          const videoId = state.currentSong?.youtubeId;
          // Prevent duplicate triggers
          if (videoId && lastEndedVideoRef.current !== videoId) {
            lastEndedVideoRef.current = videoId;
            playNextInQueue();
          }
        }
      } catch (error) {
        // Player might not be ready, ignore errors
      }
    };

    // Try to use Web Worker for more reliable background polling
    if (typeof Worker !== 'undefined' && !workerRef.current) {
      try {
        workerRef.current = new Worker('/playback-worker.js');
        workerRef.current.onmessage = () => {
          checkPlaybackStatus();
        };
      } catch (e) {
        console.warn('Web Worker not available, falling back to setInterval');
      }
    }

    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'start', interval: 1000 });
    }

    // Fallback: also use setInterval as backup
    const intervalId = setInterval(checkPlaybackStatus, 1000);

    return () => {
      clearInterval(intervalId);
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'stop' });
      }
    };
  }, [isReady, state.currentSong, playNextInQueue, playerRef]);

  // Reset lastEndedVideoRef when song changes
  useEffect(() => {
    if (state.currentSong?.youtubeId) {
      lastEndedVideoRef.current = null;
    }
  }, [state.currentSong?.youtubeId]);

  // Check playback status when tab becomes visible again
  // This catches cases where the song ended while in background
  useEffect(() => {
    if (!isReady || !playerRef.current || !state.currentSong) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && playerRef.current) {
        try {
          const playerState = playerRef.current.getPlayerState?.();
          const currentTime = playerRef.current.getCurrentTime?.() || 0;
          const duration = playerRef.current.getDuration?.() || 0;

          // If video has ended or is near the end, play next
          if (playerState === 0 || (duration > 0 && currentTime >= duration - 1.5)) {
            const videoId = state.currentSong?.youtubeId;
            if (videoId && lastEndedVideoRef.current !== videoId) {
              lastEndedVideoRef.current = videoId;
              playNextInQueue();
            }
          }
        } catch (error) {
          // Ignore errors
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isReady, state.currentSong, playNextInQueue, playerRef]);

  // Cleanup silent audio and worker on unmount
  useEffect(() => {
    return () => {
      if (silentAudioRef.current) {
        silentAudioRef.current.pause();
        silentAudioRef.current = null;
      }
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'stop' });
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // MediaSession API for OS-level media controls (works in background)
  useEffect(() => {
    if (!('mediaSession' in navigator) || !state.currentSong) return;

    const displayTitle = getDisplayTitle(state.currentSong);

    navigator.mediaSession.metadata = new MediaMetadata({
      title: displayTitle,
      artist: state.currentSong.artistString || 'Unknown Artist',
      artwork: state.currentSong.thumbUrl ? [
        { src: state.currentSong.thumbUrl, sizes: '512x512', type: 'image/jpeg' }
      ] : []
    });

    navigator.mediaSession.setActionHandler('play', () => {
      playerRef.current?.playVideo();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      playerRef.current?.pauseVideo();
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      playPrevious();
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      playNextInQueue();
    });

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
    };
  }, [state.currentSong, playNextInQueue, playPrevious, playerRef]);

  // Load new video when currentSong changes
  useEffect(() => {
    if (!state.currentSong) return;

    const newVideoId = state.currentSong.youtubeId;

    // Only load if video ID changed and player is ready
    if (isReady && playerRef.current && currentVideoId !== newVideoId) {
      try {
        playerRef.current.loadVideoById(newVideoId);
        setCurrentVideoId(newVideoId);
      } catch (error) {
        console.error('Error loading video:', error);
      }
    } else if (!isReady || !currentVideoId) {
      // Set initial video ID
      setCurrentVideoId(newVideoId);
    }
    // playerRef is a ref object and doesn't need to be in dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentSong?.youtubeId, isReady, currentVideoId, state.currentSong]);

  // Don't render player if no song is selected or no YouTube ID
  if (!state.currentSong || state.currentSong.youtubeId == null) {
    return null;
  }

  // 플레이어를 항상 같은 위치에 렌더링하되, CSS로만 표시/숨김 제어
  // React 컴포넌트 트리가 변하지 않아 재생성되지 않음
  return (
    <div
      style={{
        position: 'fixed',
        width: '400px',
        height: '400px',
        // fullscreen일 때: PlaylistLeftPanel 위치에 배치 (중앙 정렬)
        // 왼쪽 500px 컬럼 중앙 = (500 - 400) / 2 = 50px
        // 수직 중앙 = (viewport height - 플레이어 하단바 125px - 플레이어 높이 400px) / 2
        top: isFullscreen ? 'calc((100vh - 125px - 400px) / 2 - 50px)' : '-10000px',
        left: isFullscreen ? '50px' : '-10000px',
        zIndex: isFullscreen ? 50 : -1,
        pointerEvents: isFullscreen ? 'auto' : 'none',
        visibility: isFullscreen ? 'visible' : 'hidden',
      }}
    >
      <YouTube
        videoId={state.currentSong.youtubeId}
        opts={opts}
        onReady={onReady}
        onStateChange={onStateChange}
        onError={onError}
        style={youtubePlayerStyle}
      />
    </div>
  );
}
