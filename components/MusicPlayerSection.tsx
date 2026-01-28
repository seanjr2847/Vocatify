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
import Image from "next/image";
import { useMusicPlayer } from "@/lib/MusicPlayerContext";
import { FullscreenPlaylistView } from "./FullscreenPlaylistView";
import { getDisplayTitle, getYouTubeThumbnail } from "@/lib/utils/format-utils";

export const MusicPlayerSection = (): JSX.Element => {
  const {
    state,
    togglePlay,
    seekTo,
    setVolume,
    toggleFullscreen,
    playPrevious,
    playNextInQueue,
    toggleShuffle,
    toggleRepeat
  } = useMusicPlayer();

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

      <footer className="fixed bottom-0 left-0 right-0 w-full h-[80px] md:h-[125px] bg-gradient-to-r from-[#1d2123]/90 via-[#1a1a1a]/95 to-[#1d2123]/90 border-t border-[#39c5bb]/20 shadow-[0px_-25px_100px_#0f0f0f82,0_-5px_30px_rgba(57,197,187,0.1)] backdrop-blur-[20px] backdrop-brightness-[100%] [-webkit-backdrop-filter:blur(20px)_brightness(100%)] z-50">
        <div className="relative flex items-center justify-between h-full px-4 md:px-8">
          <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
          <div className="relative w-[40px] h-[40px] md:w-[49px] md:h-[49px] bg-white/10 rounded-lg overflow-hidden flex-shrink-0 shadow-lg ring-1 ring-white/10">
            {state.currentSong?.thumbUrl ? (
              <Image
                src={state.currentSong.thumbUrl}
                alt={state.currentSong ? getDisplayTitle(state.currentSong) : ''}
                fill
                className="object-cover"
                sizes="49px"
              />
            ) : state.currentSong?.youtubeId ? (
              <Image
                src={getYouTubeThumbnail(state.currentSong.youtubeId)}
                alt={state.currentSong ? getDisplayTitle(state.currentSong) : ''}
                fill
                className="object-cover"
                sizes="49px"
              />
            ) : null}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-white text-[14px] leading-[17px] whitespace-nowrap truncate">
              {state.currentSong ? getDisplayTitle(state.currentSong) : '곡을 선택하세요'}
            </span>
            <span className="font-bold text-[#ffffff70] text-[10px] leading-[12px] whitespace-nowrap truncate">
              {state.currentSong?.artistString || ''}
            </span>
          </div>
        </div>

        <div className="hidden md:flex flex-col items-center gap-4 flex-1">
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="icon"
              className={`h-auto w-auto p-0 hover:bg-transparent transition-all duration-200 ${
                state.isShuffleEnabled
                  ? 'opacity-100 text-[#39c5bb]'
                  : 'opacity-50 hover:opacity-100'
              }`}
              onClick={toggleShuffle}
              disabled={!state.currentSong}
            >
              <Shuffle className={`w-[26px] h-[26px] transition-colors ${
                state.isShuffleEnabled ? 'text-[#39c5bb]' : 'text-white'
              }`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-auto w-auto p-0 hover:bg-transparent opacity-50 hover:opacity-100 transition-opacity"
              onClick={playPrevious}
              disabled={!state.currentSong}
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
              <div className={`w-[51px] h-[51px] rounded-full flex items-center justify-center transition-all duration-300 ${state.currentSong ? 'bg-[#39c5bb] hover:scale-110 shadow-[0_0_25px_rgba(57,197,187,0.5)] hover:shadow-[0_0_35px_rgba(57,197,187,0.7)]' : 'bg-[#39c5bb50] cursor-not-allowed'}`}>
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
              className="h-auto w-auto p-0 hover:bg-transparent opacity-50 hover:opacity-100 transition-opacity"
              onClick={playNextInQueue}
              disabled={!state.currentSong || state.playlist.length === 0}
            >
              <SkipForward className="w-[26px] h-[26px] text-white" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-auto w-auto p-0 hover:bg-transparent transition-all duration-200 ${
                state.repeatMode !== 'off'
                  ? 'opacity-100 text-[#39c5bb]'
                  : 'opacity-50 hover:opacity-100'
              }`}
              onClick={toggleRepeat}
              disabled={!state.currentSong}
            >
              <div className="relative">
                <Repeat className={`w-[26px] h-[26px] transition-colors ${
                  state.repeatMode !== 'off' ? 'text-[#39c5bb]' : 'text-white'
                }`} />
                {state.repeatMode === 'one' && (
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold text-[#39c5bb]">
                    1
                  </span>
                )}
              </div>
            </Button>
          </div>

          <div
            className="relative w-full max-w-[749px] h-[12px] cursor-pointer group/progress"
            onClick={handleProgressClick}
          >
            <div className="absolute w-full h-[4px] top-[4px] left-0 bg-[#ffffff0a] rounded-[50px]" />
            <div
              className="absolute h-[4px] top-[4px] left-0 bg-gradient-to-r from-[#39c5bb] to-[#4fd9cf] rounded-[50px] transition-all shadow-[0_0_8px_rgba(57,197,187,0.4)]"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute w-[12px] h-[12px] top-0 bg-[#39c5bb] rounded-full shadow-[0_0_12px_rgba(57,197,187,0.6)] -translate-x-1/2 transition-all duration-200 group-hover/progress:scale-125 group-hover/progress:shadow-[0_0_18px_rgba(57,197,187,0.8)]"
              style={{ left: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0 md:flex-1 justify-end">
          {/* Mobile Play Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-auto w-auto p-0 hover:bg-transparent"
            onClick={togglePlay}
            disabled={!state.currentSong}
          >
            <div className={`w-[40px] h-[40px] rounded-full flex items-center justify-center transition-all duration-300 ${state.currentSong ? 'bg-[#39c5bb] hover:scale-110 shadow-[0_0_20px_rgba(57,197,187,0.5)] hover:shadow-[0_0_28px_rgba(57,197,187,0.7)]' : 'bg-[#39c5bb50] cursor-not-allowed'}`}>
              {state.isPlaying ? (
                <Pause className="w-[16px] h-[16px] text-black fill-black" />
              ) : (
                <Play className="w-[16px] h-[16px] text-black fill-black ml-0.5" />
              )}
            </div>
          </Button>

          <div className="hidden md:flex items-center gap-3 group/volume">
            <Volume2 className="w-[18px] h-[18px] text-white/70 group-hover/volume:text-[#39c5bb] transition-colors duration-200" />
            <div
              className="relative w-[160px] h-[3px] cursor-pointer"
              onClick={handleVolumeClick}
            >
              <div className="absolute w-full h-full bg-[#ffffff1a] rounded-[42px]" />
              <div
                className="absolute h-full bg-gradient-to-r from-[#39c5bb] to-[#4fd9cf] rounded-[42px] transition-all shadow-[0_0_6px_rgba(57,197,187,0.3)]"
                style={{ width: `${state.volume}%` }}
              />
            </div>
          </div>

          {/* Fullscreen Toggle Button */}
          <button
            onClick={toggleFullscreen}
            className="ml-2 md:ml-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors rounded hover:bg-white/10"
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
