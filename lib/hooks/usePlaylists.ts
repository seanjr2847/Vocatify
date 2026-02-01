"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

/**
 * Custom hook for playlist mutations
 * Following Vercel React Best Practices:
 * - rerender-functional-setstate: Use functional setState for stable callbacks
 * - client-swr-dedup: Manual deduplication for mutations (SWR for queries)
 * - rerender-defer-reads: Don't subscribe to state only used in callbacks
 */

export interface PlaylistData {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  songCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePlaylistInput {
  name: string;
  description?: string | null;
  isPublic?: boolean;
}

export interface UpdatePlaylistInput {
  name?: string;
  description?: string | null;
  isPublic?: boolean;
}

export function usePlaylists() {
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Create a new playlist
   * async-parallel: Independent operations can run in parallel
   */
  const createPlaylist = useCallback(
    async (input: CreatePlaylistInput) => {
      setIsLoading(true);

      try {
        const response = await fetch("/api/user/playlists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "플레이리스트 생성에 실패했습니다");
        }

        toast.success(`"${input.name}" 플레이리스트가 생성되었습니다`);
        return data.data as PlaylistData;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "플레이리스트 생성에 실패했습니다";
        toast.error(message);
        throw error;
      } finally {
        // rerender-functional-setstate: Use functional update
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Update playlist metadata
   */
  const updatePlaylist = useCallback(
    async (playlistId: string, input: UpdatePlaylistInput) => {
      setIsLoading(true);

      try {
        const response = await fetch(`/api/user/playlists/${playlistId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error("권한이 없습니다");
          }
          throw new Error(data.error || "플레이리스트 수정에 실패했습니다");
        }

        toast.success("플레이리스트가 수정되었습니다");
        return data.data as PlaylistData;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "플레이리스트 수정에 실패했습니다";
        toast.error(message);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Delete a playlist
   */
  const deletePlaylist = useCallback(
    async (playlistId: string, playlistName?: string) => {
      setIsLoading(true);

      try {
        const response = await fetch(`/api/user/playlists/${playlistId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const data = await response.json();
          if (response.status === 403) {
            throw new Error("권한이 없습니다");
          }
          throw new Error(data.error || "플레이리스트 삭제에 실패했습니다");
        }

        toast.success(
          playlistName
            ? `"${playlistName}" 플레이리스트가 삭제되었습니다`
            : "플레이리스트가 삭제되었습니다"
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "플레이리스트 삭제에 실패했습니다";
        toast.error(message);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Add song to playlist
   */
  const addSongToPlaylist = useCallback(
    async (playlistId: string, songId: number, songTitle?: string) => {
      setIsLoading(true);

      try {
        const response = await fetch(`/api/user/playlists/${playlistId}/songs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ songId }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 409) {
            toast.info("이미 추가된 곡입니다");
            return null;
          }
          if (response.status === 403) {
            throw new Error("권한이 없습니다");
          }
          throw new Error(data.error || "곡 추가에 실패했습니다");
        }

        toast.success(
          songTitle
            ? `"${songTitle}"이(가) 추가되었습니다`
            : "곡이 추가되었습니다"
        );
        return data.data;
      } catch (error) {
        const message = error instanceof Error ? error.message : "곡 추가에 실패했습니다";
        toast.error(message);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Remove song from playlist
   */
  const removeSongFromPlaylist = useCallback(
    async (playlistId: string, songId: number, songTitle?: string) => {
      setIsLoading(true);

      try {
        const response = await fetch(
          `/api/user/playlists/${playlistId}/songs?songId=${songId}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          const data = await response.json();
          if (response.status === 403) {
            throw new Error("권한이 없습니다");
          }
          throw new Error(data.error || "곡 제거에 실패했습니다");
        }

        toast.success(
          songTitle
            ? `"${songTitle}"이(가) 제거되었습니다`
            : "곡이 제거되었습니다"
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "곡 제거에 실패했습니다";
        toast.error(message);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Reorder songs in playlist
   * async-parallel: Batch update with Promise.all internally via API
   */
  const reorderSongs = useCallback(
    async (playlistId: string, songOrders: { songId: number; order: number }[]) => {
      setIsLoading(true);

      try {
        const response = await fetch(`/api/user/playlists/${playlistId}/songs`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ songOrders }),
        });

        if (!response.ok) {
          const data = await response.json();
          if (response.status === 403) {
            throw new Error("권한이 없습니다");
          }
          throw new Error(data.error || "곡 순서 변경에 실패했습니다");
        }

        // Silent success for drag and drop
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "곡 순서 변경에 실패했습니다";
        toast.error(message);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Bulk remove songs from playlist
   * async-parallel: Multiple deletes in parallel
   */
  const bulkRemoveSongs = useCallback(
    async (playlistId: string, songIds: number[]) => {
      setIsLoading(true);

      try {
        // js-early-exit: Early exit for empty array
        if (songIds.length === 0) {
          return;
        }

        // async-parallel: Execute all deletes in parallel
        const deletePromises = songIds.map((songId) =>
          fetch(`/api/user/playlists/${playlistId}/songs?songId=${songId}`, {
            method: "DELETE",
          })
        );

        const results = await Promise.all(deletePromises);

        // Check if any failed
        const failedCount = results.filter((r) => !r.ok).length;

        if (failedCount > 0) {
          throw new Error(`${failedCount}개 곡 삭제에 실패했습니다`);
        }

        toast.success(`${songIds.length}개 곡이 삭제되었습니다`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "일괄 삭제에 실패했습니다";
        toast.error(message);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    isLoading,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    reorderSongs,
    bulkRemoveSongs,
  };
}
