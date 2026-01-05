"use client";

import React from 'react';
import { X, GripVertical } from 'lucide-react';
import { useMusicPlayer } from '@/lib/MusicPlayerContext';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Song } from '@/lib/db';
import { getDisplayTitle } from '@/lib/utils/format-utils';

// YouTube 썸네일 URL 생성
function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

// 정렬 가능한 곡 아이템 컴포넌트
function SortableSongItem({
  song,
  onPlay,
  onRemove,
}: {
  song: Song;
  onPlay: () => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.vocadbId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 rounded-lg hover:bg-white/5 transition-colors group ${
        isDragging ? 'bg-white/10 shadow-lg' : ''
      }`}
    >
      {/* 드래그 핸들 */}
      <button
        className="cursor-grab active:cursor-grabbing p-1 text-gray-500 hover:text-gray-300 touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* 클릭 가능한 곡 정보 영역 */}
      <div
        className="flex items-center gap-4 flex-1 cursor-pointer"
        onClick={onPlay}
      >
        <img
          src={song.thumbUrl || (song.youtubeId ? getYouTubeThumbnail(song.youtubeId) : '')}
          alt={getDisplayTitle(song)}
          className="w-12 h-12 rounded object-cover"
        />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{getDisplayTitle(song)}</p>
          <p className="text-gray-400 text-xs truncate">{song.artistString}</p>
        </div>
      </div>

      {/* 삭제 버튼 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/10 rounded-full"
      >
        <X className="w-4 h-4 text-gray-400 hover:text-white" />
      </button>
    </div>
  );
}

export function QueueTabContent() {
  const { state, playSong, removeFromPlaylist, reorderPlaylist } = useMusicPlayer();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이동 후 드래그 시작 (클릭과 구분)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = state.playlist.findIndex((song) => song.vocadbId === active.id);
      const newIndex = state.playlist.findIndex((song) => song.vocadbId === over.id);
      reorderPlaylist(oldIndex, newIndex);
    }
  };

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
              src={state.currentSong.thumbUrl || (state.currentSong.youtubeId ? getYouTubeThumbnail(state.currentSong.youtubeId) : '')}
              alt={getDisplayTitle(state.currentSong)}
              className="w-16 h-16 rounded object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{getDisplayTitle(state.currentSong)}</p>
              <p className="text-gray-400 text-sm truncate">{state.currentSong.artistString}</p>
            </div>
          </div>
        </div>
      )}

      {/* NEXT UP FROM - 드래그 가능 */}
      {state.playlist.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Next up from: {state.playlistSource || 'Queue'}
            <span className="ml-2 text-gray-500 normal-case">(드래그하여 순서 변경)</span>
          </h3>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={state.playlist.map((song) => song.vocadbId)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {state.playlist.map((song) => (
                  <SortableSongItem
                    key={song.vocadbId}
                    song={song}
                    onPlay={() => playSong(song)}
                    onRemove={() => removeFromPlaylist(song.vocadbId)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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
