"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DraggableSongCard } from "./DraggableSongCard";
import { PlaylistBulkActions } from "./PlaylistBulkActions";
import { usePlaylists } from "@/lib/hooks";
import { calculateReorderedSongs } from "@/lib/utils/playlist";
import { toast } from "sonner";
import { Music } from "lucide-react";

/**
 * DraggablePlaylistSongs Component
 *
 * Vercel React Best Practices Applied:
 * - rerender-functional-setstate: Optimistic UI updates
 * - async-parallel: Independent drag operations
 * - rerender-defer-reads: State only for rendering, not callbacks
 * - rendering-hoist-jsx: Static overlay structure
 */

interface Song {
  vocadbId: number;
  defaultName: string;
  titleKorean: string | null;
  titleEnglish: string | null;
  titleJapanese: string | null;
  titleRomaji: string | null;
  artistString: string | null;
  thumbUrl: string | null;
  viewCount: bigint | null;
  lengthSeconds: number | null;
}

interface PlaylistSong {
  id: string;
  songId: number;
  order: number;
  song: Song;
}

interface DraggablePlaylistSongsProps {
  playlistId: string;
  songs: PlaylistSong[];
  isOwner: boolean;
  onReorder?: (songs: PlaylistSong[]) => void;
}

export function DraggablePlaylistSongs({
  playlistId,
  songs: initialSongs,
  isOwner,
  onReorder,
}: DraggablePlaylistSongsProps) {
  const { reorderSongs, bulkRemoveSongs, isLoading } = usePlaylists();

  // Local state for optimistic updates
  // rerender-functional-setstate: Use functional updates
  const [songs, setSongs] = useState(initialSongs);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Selection mode state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());

  // Configure sensors for drag interactions
  // rendering-hoist-jsx: Sensors configured once
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /**
   * Handle drag start - for overlay
   */
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  /**
   * Handle drag end - optimistic update + API call
   * async-defer-await: Update UI first, then API
   */
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);

    // js-early-exit: No change if dropped in same position
    if (!over || active.id === over.id) {
      return;
    }

    // Find indices
    const oldIndex = songs.findIndex((s) => s.id === active.id);
    const newIndex = songs.findIndex((s) => s.id === over.id);

    // js-early-exit: Invalid indices
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Optimistic update - rerender-functional-setstate
    const reorderedSongs = arrayMove(songs, oldIndex, newIndex);
    setSongs(reorderedSongs);

    // Notify parent component
    if (onReorder) {
      onReorder(reorderedSongs);
    }

    try {
      // Calculate new order values for API
      const songOrders = calculateReorderedSongs(
        reorderedSongs.map((s) => ({ songId: s.songId, order: s.order })),
        oldIndex,
        newIndex
      );

      // Call API to persist changes
      await reorderSongs(playlistId, songOrders);

      // Success - no toast for smooth UX
    } catch (error) {
      // Revert on error - rerender-functional-setstate
      setSongs(initialSongs);
      toast.error("곡 순서 변경에 실패했습니다");
      console.error("Failed to reorder songs:", error);
    }
  };

  /**
   * Handle drag cancel
   */
  const handleDragCancel = () => {
    setActiveId(null);
  };

  /**
   * Toggle selection mode
   */
  const handleToggleSelectMode = () => {
    setIsSelectMode((prev) => !prev);
    // Clear selections when exiting select mode
    if (isSelectMode) {
      setSelectedSongIds(new Set());
    }
  };

  /**
   * Toggle individual song selection
   */
  const handleToggleSelect = (songId: string) => {
    setSelectedSongIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(songId)) {
        newSet.delete(songId);
      } else {
        newSet.add(songId);
      }
      return newSet;
    });
  };

  /**
   * Select all songs
   */
  const handleSelectAll = () => {
    setSelectedSongIds(new Set(songs.map((s) => s.id)));
  };

  /**
   * Deselect all songs
   */
  const handleDeselectAll = () => {
    setSelectedSongIds(new Set());
  };

  /**
   * Delete selected songs
   * async-parallel: Batch delete operation
   */
  const handleDeleteSelected = async () => {
    if (selectedSongIds.size === 0) return;

    // Get the actual songIds (numbers) from the selected playlistSong IDs (strings)
    const selectedSongs = songs.filter((s) => selectedSongIds.has(s.id));
    const songIdsToDelete = selectedSongs.map((s) => s.songId);

    try {
      // Optimistic update - remove selected songs from UI
      setSongs((prev) => prev.filter((s) => !selectedSongIds.has(s.id)));
      setSelectedSongIds(new Set());
      setIsSelectMode(false);

      // Call bulk delete API with actual songIds
      await bulkRemoveSongs(playlistId, songIdsToDelete);

      toast.success(`${songIdsToDelete.length}곡이 삭제되었습니다`);
    } catch (error) {
      // Revert on error
      setSongs(initialSongs);
      toast.error("곡 삭제에 실패했습니다");
      console.error("Failed to delete songs:", error);
    }
  };

  // Get active song for overlay
  const activeSong = activeId
    ? songs.find((s) => s.id === activeId)
    : null;

  return (
    <>
      {/* Bulk Actions Toolbar */}
      <PlaylistBulkActions
        isOwner={isOwner}
        selectedCount={selectedSongIds.size}
        totalCount={songs.length}
        isSelectMode={isSelectMode}
        onToggleSelectMode={handleToggleSelectMode}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onDeleteSelected={handleDeleteSelected}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={songs.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {songs.map((playlistSong, index) => (
              <DraggableSongCard
                key={playlistSong.id}
                id={playlistSong.id}
                song={playlistSong.song}
                index={index}
                isDragDisabled={!isOwner || isLoading}
                isSelectMode={isSelectMode}
                isSelected={selectedSongIds.has(playlistSong.id)}
                onToggleSelect={() => handleToggleSelect(playlistSong.id)}
              />
            ))}
          </div>
        </SortableContext>

        {/* Drag Overlay - rendering-hoist-jsx: Static overlay structure */}
        <DragOverlay>
          {activeSong ? (
            <div
              className={`
                flex items-center gap-4
                rounded-[16px] border border-[#39c5bb]/50
                bg-[#39c5bb]/10 backdrop-blur-sm p-4
                shadow-2xl scale-105 rotate-2
              `}
            >
              {/* Drag Handle */}
              <div className="text-[#39c5bb]">
                <Music className="h-5 w-5" />
              </div>

              {/* Order Number */}
              <div className="w-8 text-center text-sm font-bold text-[#39c5bb]">
                {songs.findIndex((s) => s.id === activeSong.id) + 1}
              </div>

              {/* Thumbnail */}
              {activeSong.song.thumbUrl ? (
                <img
                  src={activeSong.song.thumbUrl}
                  alt={activeSong.song.defaultName}
                  className="h-16 w-24 rounded-[12px] object-cover shadow-lg scale-110"
                />
              ) : (
                <div className="h-16 w-24 rounded-[12px] bg-gradient-to-br from-[#39c5bb]/20 to-[#39c5bb]/5 flex items-center justify-center scale-110">
                  <Music className="h-6 w-6 text-[#39c5bb]/40" />
                </div>
              )}

              {/* Song Info */}
              <div className="flex-1 min-w-0">
                <h3
                  className="truncate text-base font-bold text-[#39c5bb]"
                  style={{ fontFamily: "Quicksand, sans-serif" }}
                >
                  {activeSong.song.titleKorean ||
                    activeSong.song.titleEnglish ||
                    activeSong.song.titleJapanese ||
                    activeSong.song.defaultName}
                </h3>
                {activeSong.song.artistString && (
                  <p className="truncate text-sm text-white/80">
                    {activeSong.song.artistString}
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}
