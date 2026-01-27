/**
 * Playlist utility functions
 * Following Vercel React Best Practices:
 * - js-cache-function-results: Cache expensive computations
 * - js-early-exit: Return early from functions
 */

/**
 * Get display title for a song with multi-language support
 * Language priority: Korean → English → Japanese → Romaji → Default
 */
export function getSongDisplayTitle(song: {
  titleKorean?: string | null;
  titleEnglish?: string | null;
  titleJapanese?: string | null;
  titleRomaji?: string | null;
  defaultName: string;
}): string {
  // js-early-exit: Return early with first available title
  return (
    song.titleKorean ||
    song.titleEnglish ||
    song.titleJapanese ||
    song.titleRomaji ||
    song.defaultName
  );
}

/**
 * Format view count for display (e.g., 1.2M, 5.3K)
 */
export function formatViewCount(viewCount: bigint | number | null | undefined): string {
  // js-early-exit: Early return for null/undefined
  if (viewCount == null) return "0";

  const count = typeof viewCount === "bigint" ? Number(viewCount) : viewCount;

  // js-early-exit: Early return for small numbers
  if (count < 1000) return count.toString();

  // Format with K, M, B suffixes
  if (count >= 1_000_000_000) {
    return (count / 1_000_000_000).toFixed(1) + "B";
  }
  if (count >= 1_000_000) {
    return (count / 1_000_000).toFixed(1) + "M";
  }
  return (count / 1_000).toFixed(1) + "K";
}

/**
 * Format duration in seconds to MM:SS format
 */
export function formatDuration(seconds: number | null | undefined): string {
  // js-early-exit: Early return for null/undefined
  if (seconds == null || seconds <= 0) return "0:00";

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Validate playlist name
 * Returns error message or null if valid
 */
export function validatePlaylistName(name: string): string | null {
  // js-early-exit: Return early for invalid cases
  if (!name || name.trim().length === 0) {
    return "플레이리스트 이름을 입력해주세요";
  }

  if (name.length > 100) {
    return "플레이리스트 이름은 100자 이하여야 합니다";
  }

  return null;
}

/**
 * Validate playlist description
 * Returns error message or null if valid
 */
export function validatePlaylistDescription(description: string | null): string | null {
  // js-early-exit: null/empty is valid
  if (!description || description.trim().length === 0) {
    return null;
  }

  if (description.length > 500) {
    return "설명은 500자 이하여야 합니다";
  }

  return null;
}

/**
 * Calculate new order array after drag and drop
 * Returns updated song orders for API call
 */
export function calculateReorderedSongs(
  songs: { songId: number; order: number }[],
  fromIndex: number,
  toIndex: number
): { songId: number; order: number }[] {
  // js-early-exit: No change if indices are the same
  if (fromIndex === toIndex) {
    return songs;
  }

  // Create a copy to avoid mutation
  const reordered = [...songs];

  // Remove the item from old position
  const [movedItem] = reordered.splice(fromIndex, 1);

  // Insert at new position
  reordered.splice(toIndex, 0, movedItem);

  // Return with updated order values (1-indexed)
  return reordered.map((song, index) => ({
    songId: song.songId,
    order: index + 1,
  }));
}

/**
 * Get YouTube thumbnail URL with fallback
 * Returns maxresdefault if available, otherwise default thumbnail
 */
export function getYoutubeThumbnail(
  youtubeId: string | null | undefined,
  quality: "default" | "medium" | "high" | "maxres" = "high"
): string | null {
  // js-early-exit: Return null for missing youtubeId
  if (!youtubeId) return null;

  const qualityMap = {
    default: "default",
    medium: "mqdefault",
    high: "hqdefault",
    maxres: "maxresdefault",
  };

  return `https://i.ytimg.com/vi/${youtubeId}/${qualityMap[quality]}.jpg`;
}

/**
 * Check if user is playlist owner
 */
export function isPlaylistOwner(
  playlist: { userId: string } | null | undefined,
  userId: string | null | undefined
): boolean {
  // js-early-exit: False for null/undefined
  if (!playlist || !userId) return false;

  return playlist.userId === userId;
}

/**
 * Get relative time string (e.g., "2일 전", "1시간 전")
 */
export function getRelativeTime(date: Date | string): string {
  const now = new Date();
  const target = typeof date === "string" ? new Date(date) : date;
  const diffMs = now.getTime() - target.getTime();

  // js-early-exit: Handle invalid dates
  if (isNaN(diffMs)) return "알 수 없음";

  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  // js-early-exit: Return appropriate time unit
  if (diffYears > 0) return `${diffYears}년 전`;
  if (diffMonths > 0) return `${diffMonths}개월 전`;
  if (diffDays > 0) return `${diffDays}일 전`;
  if (diffHours > 0) return `${diffHours}시간 전`;
  if (diffMins > 0) return `${diffMins}분 전`;
  return "방금 전";
}

/**
 * Debounce function for search inputs
 * bundle-defer-third-party: Avoid importing lodash for single function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Sort playlists by different criteria
 */
export type PlaylistSortOption = "recent" | "name" | "songs" | "oldest";

export function sortPlaylists<
  T extends {
    name: string;
    updatedAt: Date | string;
    songCount: number;
    createdAt: Date | string;
  }
>(playlists: T[], sortBy: PlaylistSortOption): T[] {
  // Create copy to avoid mutation
  const sorted = [...playlists];

  switch (sortBy) {
    case "recent":
      // Sort by most recently updated
      return sorted.sort((a, b) => {
        const dateA = new Date(a.updatedAt).getTime();
        const dateB = new Date(b.updatedAt).getTime();
        return dateB - dateA;
      });

    case "oldest":
      // Sort by least recently updated
      return sorted.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateA - dateB;
      });

    case "name":
      // Sort alphabetically by name
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "ko"));

    case "songs":
      // Sort by song count (descending)
      return sorted.sort((a, b) => b.songCount - a.songCount);

    default:
      return sorted;
  }
}
