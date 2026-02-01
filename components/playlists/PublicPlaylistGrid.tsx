"use client";

import { useState, useCallback, useMemo } from "react";
import { Search, SlidersHorizontal, Globe } from "lucide-react";
import { PublicPlaylistCard } from "./PublicPlaylistCard";
import { EmptyState } from "./EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * PublicPlaylistGrid Component
 *
 * Discovery interface with search and sort
 * Vercel React Best Practices Applied:
 * - rerender-functional-setstate: All state updates functional
 * - rendering-hoist-jsx: Static UI elements hoisted
 * - rerender-memo: Filtered results memoized
 */

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  songCount: number;
  updatedAt: Date;
}

interface PublicPlaylistGridProps {
  initialPlaylists: Playlist[];
}

export function PublicPlaylistGrid({ initialPlaylists }: PublicPlaylistGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "songs" | "name">("recent");

  /**
   * Handle search input
   * rerender-functional-setstate: Functional update
   */
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  /**
   * Handle sort change
   */
  const handleSortChange = useCallback((value: string) => {
    setSortBy(value as "recent" | "songs" | "name");
  }, []);

  /**
   * Filter and sort playlists
   * rerender-memo: Memoized filtering logic
   */
  const filteredPlaylists = useMemo(() => {
    let results = initialPlaylists;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter((p) =>
        p.name.toLowerCase().includes(query)
      );
    }

    // Sort results
    const sorted = [...results];
    switch (sortBy) {
      case "songs":
        sorted.sort((a, b) => b.songCount - a.songCount);
        break;
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "recent":
      default:
        sorted.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        break;
    }

    return sorted;
  }, [initialPlaylists, searchQuery, sortBy]);

  return (
    <div className="space-y-8">
      {/* Header with Search and Sort */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search Bar - Terminal Style */}
        <div className="relative flex-1 w-full sm:max-w-md">
          <div
            className={`
              absolute left-4 top-1/2 -translate-y-1/2
              text-white/40 transition-colors duration-300
              ${searchQuery ? "text-[#39c5bb]" : ""}
            `}
          >
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="플레이리스트 검색..."
            className={`
              w-full h-12 pl-12 pr-4
              rounded-full border-2
              bg-white/5 backdrop-blur-sm
              text-white placeholder:text-white/40
              transition-all duration-300
              focus:outline-none focus:ring-2 focus:ring-[#39c5bb]/50
              ${
                searchQuery
                  ? "border-[#39c5bb]/50 bg-white/10"
                  : "border-white/10 hover:border-white/20"
              }
            `}
            style={{ fontFamily: "Quicksand, sans-serif" }}
          />
          {/* Active indicator */}
          {searchQuery && (
            <div
              className={`
                absolute right-4 top-1/2 -translate-y-1/2
                w-2 h-2 rounded-full bg-[#39c5bb]
                animate-pulse
              `}
            />
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 text-white/60">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="text-sm font-medium">정렬</span>
          </div>
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger
              className={`
                w-[180px] h-12 rounded-full
                border-2 border-white/10
                bg-white/5 backdrop-blur-sm
                text-white font-medium
                hover:border-white/20 hover:bg-white/10
                focus:ring-2 focus:ring-[#39c5bb]/50
                transition-all duration-300
              `}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-black border-white/20 rounded-[16px]">
              <SelectItem
                value="recent"
                className="text-white cursor-pointer focus:bg-white/10"
              >
                최신순
              </SelectItem>
              <SelectItem
                value="songs"
                className="text-white cursor-pointer focus:bg-white/10"
              >
                곡 많은 순
              </SelectItem>
              <SelectItem
                value="name"
                className="text-white cursor-pointer focus:bg-white/10"
              >
                가나다순
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center gap-2 text-white/60 text-sm">
        <Globe className="h-4 w-4" />
        <span>
          <span className="text-[#39c5bb] font-bold">{filteredPlaylists.length}</span>개의
          공개 플레이리스트
        </span>
      </div>

      {/* Playlist Grid */}
      {filteredPlaylists.length === 0 ? (
        <EmptyState
          icon={Globe}
          title={searchQuery ? "검색 결과가 없습니다" : "공개 플레이리스트가 없습니다"}
          description={
            searchQuery
              ? `"${searchQuery}"에 해당하는 플레이리스트를 찾을 수 없습니다`
              : "아직 공개된 플레이리스트가 없습니다"
          }
          actionLabel="내 플레이리스트로 이동"
          actionHref="/playlists"
        />
      ) : (
        <div
          className={`
            grid gap-6
            grid-cols-1 md:grid-cols-2 lg:grid-cols-3
          `}
        >
          {filteredPlaylists.map((playlist, index) => (
            <PublicPlaylistCard
              key={playlist.id}
              id={playlist.id}
              name={playlist.name}
              description={playlist.description}
              songCount={playlist.songCount}
              updatedAt={playlist.updatedAt}
              animationDelay={index * 50}
            />
          ))}
        </div>
      )}
    </div>
  );
}
