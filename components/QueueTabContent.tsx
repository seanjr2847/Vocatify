"use client";

import React, { memo, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { X, GripVertical, Play, Radio } from 'lucide-react';
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

function getSongThumbnail(song: Song): string {
  return song.thumbUrl || (song.youtubeId ? getYouTubeThumbnail(song.youtubeId) : '/placeholder.png');
}

interface SortableSongItemProps {
  song: Song;
  onPlay: () => void;
  onRemove: () => void;
}

// 정렬 가능한 곡 아이템 (다음 곡 영역용)
const SortableSongItem = memo(function SortableSongItem({
  song,
  onPlay,
  onRemove,
}: SortableSongItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.vocadbId });

  const style = useMemo(() => ({
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  }), [transform, transition, isDragging]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove();
  }, [onRemove]);

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
        <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
          <Image
            src={getSongThumbnail(song)}
            alt={getDisplayTitle(song)}
            fill
            className="object-cover"
            sizes="48px"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{getDisplayTitle(song)}</p>
          <p className="text-gray-400 text-xs truncate">{song.artistString}</p>
        </div>
      </div>

      {/* 삭제 버튼 */}
      <button
        onClick={handleRemove}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/10 rounded-full"
      >
        <X className="w-4 h-4 text-gray-400 hover:text-white" />
      </button>
    </div>
  );
});

// 재생 완료된 곡 아이템 (dimmed, 클릭만 가능)
const PlayedSongItem = memo(function PlayedSongItem({
  song,
  onPlay,
}: {
  song: Song;
  onPlay: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer opacity-50"
      onClick={onPlay}
    >
      {/* 드래그 핸들 자리 (빈 공간으로 정렬 맞춤) */}
      <div className="p-1 w-6" />

      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
          <Image
            src={getSongThumbnail(song)}
            alt={getDisplayTitle(song)}
            fill
            className="object-cover"
            sizes="48px"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{getDisplayTitle(song)}</p>
          <p className="text-gray-400 text-xs truncate">{song.artistString}</p>
        </div>
      </div>
    </div>
  );
});

export function QueueTabContent() {
  const { state, playSong, removeFromPlaylist, reorderPlaylist, switchToUserQueue } = useMusicPlayer();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const isUserMode = state.activeSource === 'user';
  const queueIndex = state.userQueueIndex;

  // 큐를 3개 영역으로 분할
  const playedSongs = useMemo(
    () => queueIndex > 0 ? state.userQueue.slice(0, queueIndex) : [],
    [state.userQueue, queueIndex]
  );

  const currentQueueSong = useMemo(
    () => (isUserMode && queueIndex >= 0 && queueIndex < state.userQueue.length)
      ? state.userQueue[queueIndex]
      : null,
    [state.userQueue, queueIndex, isUserMode]
  );

  const upcomingSongs = useMemo(
    () => queueIndex >= 0 ? state.userQueue.slice(queueIndex + 1) : state.userQueue,
    [state.userQueue, queueIndex]
  );

  const upcomingSongIds = useMemo(
    () => upcomingSongs.map((song) => song.vocadbId),
    [upcomingSongs]
  );

  // DnD에서 upcoming 인덱스 → 전체 큐 인덱스로 매핑
  const upcomingStartIndex = queueIndex >= 0 ? queueIndex + 1 : 0;

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldDndIndex = upcomingSongs.findIndex((song) => song.vocadbId === active.id);
    const newDndIndex = upcomingSongs.findIndex((song) => song.vocadbId === over.id);
    if (oldDndIndex === -1 || newDndIndex === -1) return;

    reorderPlaylist(upcomingStartIndex + oldDndIndex, upcomingStartIndex + newDndIndex);
  }, [upcomingSongs, upcomingStartIndex, reorderPlaylist]);

  // 현재 재생 중인 곡 (큐 밖에서 재생 중인 경우)
  const currentNonQueueSong = isUserMode && queueIndex < 0 && state.currentSong ? state.currentSong : null;

  return (
    <div className="p-8">
      {/* Radio Mode Indicator */}
      {state.activeSource === 'radio' && state.userQueue.length > 0 && (
        <div className="px-4 py-3 mb-4 bg-gradient-to-r from-blue-500/10 to-transparent border-l-2 border-blue-500 rounded-r-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-white">
                  라디오 재생 중
                </p>
                <p className="text-xs text-white/50">
                  대기열에 {state.userQueue.length}곡이 있습니다
                </p>
              </div>
            </div>
            <button
              onClick={switchToUserQueue}
              className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10"
            >
              <Play className="w-4 h-4" />
              대기열 재생
            </button>
          </div>
        </div>
      )}

      {/* 큐에 곡이 있을 때 */}
      {(state.userQueue.length > 0 || currentNonQueueSong) && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Playing from {state.userQueueSource || 'Queue'}
            <span className="ml-2 text-gray-500 normal-case">
              ({state.userQueue.length}곡)
            </span>
          </h3>

          {/* 큐 밖에서 재생 중인 곡 (검색 등에서 직접 재생) */}
          {currentNonQueueSong && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#39c5bb15] border border-[#39c5bb30] mb-1">
              <div className="p-1 text-[#39c5bb]">
                <div className="w-4 h-4 flex items-center justify-center">
                  <div className="w-2 h-2 bg-[#39c5bb] rounded-full animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-4 flex-1">
                <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
                  <Image
                    src={getSongThumbnail(currentNonQueueSong)}
                    alt={getDisplayTitle(currentNonQueueSong)}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{getDisplayTitle(currentNonQueueSong)}</p>
                  <p className="text-gray-400 text-xs truncate">{currentNonQueueSong.artistString}</p>
                </div>
              </div>
            </div>
          )}

          {/* 재생 완료된 곡 (dimmed) */}
          {playedSongs.length > 0 && (
            <div className="space-y-0">
              {playedSongs.map((song) => (
                <PlayedSongItem
                  key={song.vocadbId}
                  song={song}
                  onPlay={() => playSong(song)}
                />
              ))}
            </div>
          )}

          {/* 현재 재생 중인 곡 (큐에서 재생 중일 때) */}
          {currentQueueSong && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#39c5bb15] border border-[#39c5bb30] my-0.5">
              <div className="p-1 text-[#39c5bb]">
                <div className="w-4 h-4 flex items-center justify-center">
                  <div className="w-2 h-2 bg-[#39c5bb] rounded-full animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-4 flex-1">
                <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
                  <Image
                    src={getSongThumbnail(currentQueueSong)}
                    alt={getDisplayTitle(currentQueueSong)}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{getDisplayTitle(currentQueueSong)}</p>
                  <p className="text-gray-400 text-xs truncate">{currentQueueSong.artistString}</p>
                </div>
              </div>
            </div>
          )}

          {/* 다음 곡 목록 (드래그 가능) */}
          {upcomingSongs.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={upcomingSongIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-0">
                  {upcomingSongs.map((song) => (
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
          )}
        </div>
      )}

      {/* Empty State */}
      {state.userQueue.length === 0 && !currentNonQueueSong && (
        <div className="text-center text-gray-400 py-12">
          <p>재생목록이 비어있습니다</p>
          {state.activeSource === 'radio' && (
            <p className="text-sm text-gray-500 mt-2">
              라디오 재생 중에도 곡을 추가할 수 있습니다
            </p>
          )}
        </div>
      )}
    </div>
  );
}
