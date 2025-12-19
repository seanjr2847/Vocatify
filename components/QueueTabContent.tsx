"use client";

import React from 'react';
import { X } from 'lucide-react';
import { useMusicPlayer } from '@/lib/MusicPlayerContext';

// YouTube 썸네일 URL 생성
function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

export function QueueTabContent() {
  const { state, playSong, removeFromPlaylist } = useMusicPlayer();

  return (
    <div className="p-8">
      {/* PLAYING FROM */}
      {state.currentSong && (
        <div className="mb-8">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Playing from: {state.playlistSource || 'Queue'}
          </h3>
          <div className="flex items-center gap-4 p-4 rounded-lg bg-[#39c5bb15] border border-[#39c5bb30]">
            <img
              src={state.currentSong.thumbUrl || getYouTubeThumbnail(state.currentSong.youtubeId)}
              alt={state.currentSong.title}
              className="w-16 h-16 rounded object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{state.currentSong.title}</p>
              <p className="text-gray-400 text-sm truncate">{state.currentSong.artist}</p>
            </div>
          </div>
        </div>
      )}

      {/* NEXT UP FROM */}
      {state.playlist.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Next up from: {state.playlistSource || 'Queue'}
          </h3>
          <div className="space-y-2">
            {state.playlist.map((song) => (
              <div
                key={song.vocadbId}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer"
                onClick={() => playSong(song)}
              >
                <img
                  src={song.thumbUrl || getYouTubeThumbnail(song.youtubeId)}
                  alt={song.title}
                  className="w-12 h-12 rounded object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{song.title}</p>
                  <p className="text-gray-400 text-xs truncate">{song.artist}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromPlaylist(song.vocadbId);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/10 rounded-full"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!state.currentSong && state.playlist.length === 0 && (
        <div className="text-center text-gray-400 py-12">
          재생목록이 비어있습니다
        </div>
      )}
    </div>
  );
}
