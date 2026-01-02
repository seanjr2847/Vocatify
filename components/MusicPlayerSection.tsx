"use client";

import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import React from "react";
import { useMusicPlayer } from "@/lib/MusicPlayerContext";
import { FullscreenPlaylistView } from "./FullscreenPlaylistView";

function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

export const MusicPlayerSection = (): JSX.Element => {
  const { state, togglePlay, seekTo, setVolume, toggleFullscreen } = useMusicPlayer();

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!state.duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = state.duration * percent;
    seekTo(newTime);
  };

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newVolume = Math.round(percent * 100);
    setVolume(newVolume);
  };

  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  return (
    <>
      {/* 전체화면 재생목록 */}
      <FullscreenPlaylistView />

      <footer className="fixed bottom-0 left-0 right-0 w-full h-[125px] bg-[#1d21234c] border-t border-solid border-[#ffffff1a] shadow-[0px_-25px_100px_#0f0f0f82] backdrop-blur-[15px] backdrop-brightness-[100%] [-webkit-backdrop-filter:blur(15px)_brightness(100%)] z-50">
        <div className="relative flex items-center justify-between h-full px-8">
          <div className="flex items-center gap-4 flex-1">
          <div className="w-[49px] h-[49px] bg-white/10 rounded overflow-hidden flex-shrink-0">
            {state.currentSong?.thumbUrl ? (
              <img
                src={state.currentSong.thumbUrl}
                alt={state.currentSong.titleKorean ?? state.currentSong.titleEnglish ?? state.currentSong.defaultName}
                className="w-full h-full object-cover"
              />
            ) : state.currentSong?.youtubeId ? (
              <img
                src={getYouTubeThumbnail(state.currentSong.youtubeId)}
                alt={state.currentSong.titleKorean ?? state.currentSong.titleEnglish ?? state.currentSong.defaultName}
                className="w-full h-full object-cover"
              />
            ) : null}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-white text-[14px] leading-[17px] whitespace-nowrap truncate">
              {state.currentSong?.titleKorean ?? state.currentSong?.titleEnglish ?? state.currentSong?.defaultName ?? '곡을 선택하세요'}
            </span>
            <span className="font-bold text-[#ffffff70] text-[10px] leading-[12px] whitespace-nowrap truncate">
              {state.currentSong?.artistString || ''}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 flex-1">
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="icon"
              className="h-auto w-auto p-0 hover:bg-transparent opacity-50 cursor-not-allowed"
              disabled
            >
              <Shuffle className="w-[26px] h-[26px] text-white" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-auto w-auto p-0 hover:bg-transparent opacity-50 cursor-not-allowed"
              disabled
            >
              <SkipBack className="w-[26px] h-[26px] text-white" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-auto w-auto p-0 hover:bg-transparent"
              onClick={togglePlay}
              disabled={!state.currentSong}
            >
              <div className={`w-[51px] h-[51px] rounded-full flex items-center justify-center transition-all ${state.currentSong ? 'bg-[#39c5bb] hover:scale-105' : 'bg-[#39c5bb50] cursor-not-allowed'}`}>
                {state.isPlaying ? (
                  <Pause className="w-[20px] h-[20px] text-black fill-black" />
                ) : (
                  <Play className="w-[20px] h-[20px] text-black fill-black ml-1" />
                )}
              </div>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-auto w-auto p-0 hover:bg-transparent opacity-50 cursor-not-allowed"
              disabled
            >
              <SkipForward className="w-[26px] h-[26px] text-white" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-auto w-auto p-0 hover:bg-transparent opacity-50 cursor-not-allowed"
              disabled
            >
              <Repeat className="w-[26px] h-[26px] text-white" />
            </Button>
          </div>

          <div
            className="relative w-[749px] h-[12px] cursor-pointer"
            onClick={handleProgressClick}
          >
            <div className="absolute w-full h-[4px] top-[4px] left-0 bg-[#ffffff0a] rounded-[50px]" />
            <div
              className="absolute h-[4px] top-[4px] left-0 bg-[#39c5bb] rounded-[50px] transition-all"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute w-[12px] h-[12px] top-0 bg-[#39c5bb] rounded-full shadow-[0px_0px_8px_#000000eb] -translate-x-1/2 transition-all"
              style={{ left: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-1 justify-end">
          <Volume2 className="w-[18px] h-[18px] text-white" />
          <div
            className="relative w-[160px] h-[3px] cursor-pointer"
            onClick={handleVolumeClick}
          >
            <div className="absolute w-full h-full bg-[#ffffff1a] rounded-[42px]" />
            <div
              className="absolute h-full bg-[#39c5bb] rounded-[42px] transition-all"
              style={{ width: `${state.volume}%` }}
            />
          </div>

          {/* Fullscreen Toggle Button */}
          <button
            onClick={toggleFullscreen}
            className="ml-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors rounded hover:bg-white/10"
            aria-label={state.viewMode === 'minimized' ? "재생목록 보기" : "재생목록 숨기기"}
          >
            {state.viewMode === 'minimized' ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </footer>
  </>
  );
};

export default MusicPlayerSection;
