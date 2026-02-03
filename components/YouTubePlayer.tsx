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
  const pendingVideoIdRef = useRef<string | null>(null); // 백그라운드에서 대기 중인 비디오

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
    const stateNames: Record<number, string> = {
      [-1]: 'UNSTARTED',
      0: 'ENDED',
      1: 'PLAYING',
      2: 'PAUSED',
      3: 'BUFFERING',
      5: 'CUED'
    };
    console.log(`[YT] onStateChange: ${stateNames[playerState] || playerState} (${playerState})`);

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
      console.log('[YT] Video ended naturally, calling playNextInQueue');
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
        console.log('[BG] Stopping silent audio (not playing)');
        silentAudioRef.current.pause();
      }
      return;
    }

    // Create silent audio element if not exists
    if (!silentAudioRef.current) {
      console.log('[BG] Creating silent audio element');
      // Create a very short silent audio using data URI (10ms of silence)
      const silentAudio = new Audio(
        'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='
      );
      silentAudio.loop = true;
      silentAudio.volume = 0.01; // Nearly silent
      silentAudioRef.current = silentAudio;
    }

    // Play silent audio to keep tab active
    silentAudioRef.current.play()
      .then(() => console.log('[BG] Silent audio playing'))
      .catch((err) => console.warn('[BG] Silent audio blocked:', err.message));

    return () => {
      if (silentAudioRef.current) {
        silentAudioRef.current.pause();
      }
    };
  }, [state.isPlaying]);

  // Store playNextInQueue in a ref to avoid re-creating polling effect
  const playNextInQueueRef = useRef(playNextInQueue);
  useEffect(() => {
    playNextInQueueRef.current = playNextInQueue;
  }, [playNextInQueue]);

  // Polling mechanism for background tab support using Web Worker
  // Web Workers are less affected by browser throttling than setInterval
  useEffect(() => {
    if (!isReady || !playerRef.current || !state.currentSong) return;

    let pollCount = 0;
    const checkPlaybackStatus = () => {
      if (!playerRef.current) {
        console.log('[POLL] playerRef is null');
        return;
      }

      // Skip if there's a pending video waiting to be loaded (background tab case)
      // This prevents false "ended" detection when player still shows previous video state
      if (pendingVideoIdRef.current) {
        console.log('[POLL] Skipping - pending video waiting:', pendingVideoIdRef.current);
        return;
      }

      // Skip if the loaded video doesn't match the current song (video not yet loaded)
      if (currentVideoId !== state.currentSong?.youtubeId) {
        console.log(`[POLL] Skipping - video mismatch: loaded=${currentVideoId}, expected=${state.currentSong?.youtubeId}`);
        return;
      }

      try {
        const playerState = playerRef.current.getPlayerState?.();
        const currentTime = playerRef.current.getCurrentTime?.() || 0;
        const duration = playerRef.current.getDuration?.() || 0;

        // Log every 10th poll to reduce spam
        pollCount++;
        if (pollCount % 10 === 0) {
          console.log(`[POLL] state=${playerState}, time=${currentTime.toFixed(1)}/${duration.toFixed(1)}, visible=${document.visibilityState}`);
        }

        // Check if video ended (state 0 or near end of video)
        // Using a 1.5 second threshold to handle background throttling
        if (playerState === 0 || (duration > 0 && currentTime >= duration - 1.5)) {
          const videoId = state.currentSong?.youtubeId;
          console.log(`[POLL] End detected! state=${playerState}, time=${currentTime}/${duration}, videoId=${videoId}`);
          // Prevent duplicate triggers
          if (videoId && lastEndedVideoRef.current !== videoId) {
            console.log('[POLL] Triggering playNextInQueue');
            lastEndedVideoRef.current = videoId;
            playNextInQueueRef.current();
          } else {
            console.log('[POLL] Skipping (duplicate or no videoId)');
          }
        }
      } catch (error) {
        console.warn('[POLL] Error:', error);
      }
    };

    // Initialize Web Worker once if not exists
    if (typeof Worker !== 'undefined' && !workerRef.current) {
      try {
        workerRef.current = new Worker('/playback-worker.js');
        console.log('[BG] Web Worker created');
      } catch (e) {
        console.warn('[BG] Web Worker not available, falling back to setInterval:', e);
      }
    }

    // Set up Worker message handler and start
    if (workerRef.current) {
      workerRef.current.onmessage = () => {
        checkPlaybackStatus();
      };
      workerRef.current.postMessage({ type: 'start', interval: 1000 });
      console.log('[BG] Web Worker started');
    }

    // Fallback: also use setInterval as backup
    const intervalId = setInterval(checkPlaybackStatus, 1000);
    console.log('[BG] setInterval fallback started');

    return () => {
      clearInterval(intervalId);
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'stop' });
      }
    };
  }, [isReady, state.currentSong, playerRef, currentVideoId]);

  // Reset lastEndedVideoRef when song changes
  useEffect(() => {
    if (state.currentSong?.youtubeId) {
      lastEndedVideoRef.current = null;
    }
  }, [state.currentSong?.youtubeId]);

  // Check playback status when tab becomes visible again
  // This catches cases where the song ended while in background
  // Also loads pending videos that were deferred during background
  useEffect(() => {
    if (!isReady || !playerRef.current || !state.currentSong) return;

    const handleVisibilityChange = () => {
      console.log(`[VIS] visibilityState changed to: ${document.visibilityState}`);
      if (document.visibilityState === 'visible' && playerRef.current) {
        // 먼저 pending video가 있으면 로드 시도
        if (pendingVideoIdRef.current) {
          const pendingId = pendingVideoIdRef.current;
          console.log('[VIS] Loading pending video:', pendingId);
          pendingVideoIdRef.current = null;
          try {
            // 방법 1: loadVideoById 직접 호출 (isReady && playerRef.current인 경우)
            if (playerRef.current) {
              playerRef.current.loadVideoById(pendingId);
            }
            // 방법 2: currentVideoId 변경 (react-youtube가 감지해서 로드)
            setCurrentVideoId(pendingId);
            return; // 비디오 로드 후 체크는 다음 이벤트에서
          } catch (error) {
            console.warn('[VIS] Failed to load pending video:', error);
            // 실패해도 currentVideoId는 업데이트 (react-youtube가 재시도)
            setCurrentVideoId(pendingId);
          }
        }

        try {
          const playerState = playerRef.current.getPlayerState?.();
          const currentTime = playerRef.current.getCurrentTime?.() || 0;
          const duration = playerRef.current.getDuration?.() || 0;

          console.log(`[VIS] Tab visible - state=${playerState}, time=${currentTime.toFixed(1)}/${duration.toFixed(1)}`);

          // If video has ended or is near the end, play next
          if (playerState === 0 || (duration > 0 && currentTime >= duration - 1.5)) {
            const videoId = state.currentSong?.youtubeId;
            console.log(`[VIS] End detected on return! videoId=${videoId}`);
            if (videoId && lastEndedVideoRef.current !== videoId) {
              console.log('[VIS] Triggering playNextInQueue');
              lastEndedVideoRef.current = videoId;
              playNextInQueueRef.current();
            }
          }
        } catch (error) {
          console.warn('[VIS] Error checking state:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isReady, state.currentSong, playerRef]);

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
      // 백그라운드 탭일 때는 로드 지연 (iframe 통신 실패 방지)
      // 중요: setCurrentVideoId 호출하지 않음 - prop이 바뀌면 react-youtube가 자동 로드 시도
      if (document.visibilityState === 'hidden') {
        console.log('[YT] Background tab - deferring video load:', newVideoId);
        pendingVideoIdRef.current = newVideoId;
        // currentVideoId는 변경하지 않음! visible 될 때 변경
        return;
      }

      try {
        console.log('[YT] Loading video:', newVideoId);
        playerRef.current.loadVideoById(newVideoId);
        setCurrentVideoId(newVideoId);
        pendingVideoIdRef.current = null;
      } catch (error) {
        console.error('[YT] Error loading video:', error);
        // 실패 시 pending에 저장하여 visible 될 때 재시도
        pendingVideoIdRef.current = newVideoId;
        setCurrentVideoId(newVideoId);
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
  // 중요: visibility: hidden 대신 화면 밖 위치 + opacity로 숨김
  // visibility: hidden은 일부 브라우저에서 iframe 재생을 중단시킴
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
        // visibility: hidden 대신 opacity: 0 사용 (백그라운드 재생 유지)
        opacity: isFullscreen ? 1 : 0,
      }}
    >
      <YouTube
        videoId={currentVideoId || state.currentSong.youtubeId}
        opts={opts}
        onReady={onReady}
        onStateChange={onStateChange}
        onError={onError}
        style={youtubePlayerStyle}
      />
    </div>
  );
}
