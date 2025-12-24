"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import YouTube, { YouTubeProps, YouTubeEvent } from 'react-youtube';
import { useMusicPlayer } from '@/lib/MusicPlayerContext';

export function YouTubePlayer() {
  const { state, playerRef, updateDuration, updatePlayingState, playNextInQueue } = useMusicPlayer();
  const [isReady, setIsReady] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

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
  }, []);

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
  }, [state.currentSong?.youtubeId, isReady]);

  // Don't render player if no song is selected
  if (!state.currentSong) {
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
