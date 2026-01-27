"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

/**
 * Custom hook for favorites mutations
 * Following Vercel React Best Practices:
 * - rerender-functional-setstate: Use functional setState for stable callbacks
 * - rerender-defer-reads: Don't subscribe to state only used in callbacks
 */

export function useFavorites() {
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Toggle favorite status for a song
   * Optimistic update pattern with rollback on error
   */
  const toggleFavorite = useCallback(
    async (
      songId: number,
      currentState: boolean,
      songTitle?: string
    ): Promise<boolean> => {
      setIsLoading(true);

      // Optimistic state for caller to update UI immediately
      const newState = !currentState;

      try {
        const method = currentState ? "DELETE" : "POST";
        const response = await fetch("/api/user/favorites", {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ songId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "즐겨찾기 업데이트에 실패했습니다");
        }

        // Success toast
        if (method === "POST") {
          toast.success(
            songTitle
              ? `"${songTitle}" 즐겨찾기에 추가되었습니다`
              : "즐겨찾기에 추가되었습니다"
          );
        } else {
          toast.success(
            songTitle
              ? `"${songTitle}" 즐겨찾기에서 제거되었습니다`
              : "즐겨찾기에서 제거되었습니다"
          );
        }

        return newState;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "즐겨찾기 업데이트에 실패했습니다";
        toast.error(message);
        throw error;
      } finally {
        // rerender-functional-setstate: Use functional update
        setIsLoading((prev) => false);
      }
    },
    []
  );

  /**
   * Add multiple songs to favorites
   * async-parallel: Execute all adds in parallel
   */
  const bulkAddFavorites = useCallback(async (songIds: number[]) => {
    setIsLoading(true);

    try {
      // js-early-exit: Early exit for empty array
      if (songIds.length === 0) {
        return;
      }

      // async-parallel: Execute all adds in parallel using Promise.all
      const addPromises = songIds.map((songId) =>
        fetch("/api/user/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ songId }),
        })
      );

      const results = await Promise.all(addPromises);

      // Check if any failed
      const failedCount = results.filter((r) => !r.ok).length;

      if (failedCount > 0) {
        throw new Error(`${failedCount}개 곡 추가에 실패했습니다`);
      }

      toast.success(`${songIds.length}개 곡이 즐겨찾기에 추가되었습니다`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "일괄 추가에 실패했습니다";
      toast.error(message);
      throw error;
    } finally {
      setIsLoading((prev) => false);
    }
  }, []);

  /**
   * Remove multiple songs from favorites
   * async-parallel: Execute all deletes in parallel
   */
  const bulkRemoveFavorites = useCallback(async (songIds: number[]) => {
    setIsLoading(true);

    try {
      // js-early-exit: Early exit for empty array
      if (songIds.length === 0) {
        return;
      }

      // async-parallel: Execute all deletes in parallel using Promise.all
      const deletePromises = songIds.map((songId) =>
        fetch("/api/user/favorites", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ songId }),
        })
      );

      const results = await Promise.all(deletePromises);

      // Check if any failed
      const failedCount = results.filter((r) => !r.ok).length;

      if (failedCount > 0) {
        throw new Error(`${failedCount}개 곡 삭제에 실패했습니다`);
      }

      toast.success(`${songIds.length}개 곡이 즐겨찾기에서 제거되었습니다`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "일괄 삭제에 실패했습니다";
      toast.error(message);
      throw error;
    } finally {
      setIsLoading((prev) => false);
    }
  }, []);

  return {
    isLoading,
    toggleFavorite,
    bulkAddFavorites,
    bulkRemoveFavorites,
  };
}
