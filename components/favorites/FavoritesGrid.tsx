"use client";

import { useState, useMemo, useCallback } from "react";
import { Heart, SlidersHorizontal } from "lucide-react";
import { RankingSongCard } from "@/components/charts/RankingSongCard";
import { EmptyState } from "@/components/playlists/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * FavoritesGrid Component
 *
 * Personal music collection with emotional warmth
 * Vercel React Best Practices Applied:
 * - rerender-functional-setstate: All state updates functional
 * - rendering-hoist-jsx: Static UI elements hoisted
 * - rerender-memo: Sorted results memoized
 * - server-serialization: Accepts serialized favorite data
 */

interface FavoriteSong {
  id: string;
  songId: number;
  createdAt: Date;
  song: {
    vocadbId: number;
    defaultName: string;
    titleKorean: string | null;
    titleEnglish: string | null;
    titleJapanese: string | null;
    titleRomaji: string | null;
    artistString: string | null;
    youtubeId: string | null;
    youtubeUrl: string | null;
    thumbUrl: string | null;
    viewCount: string | null;
    publishDate: Date | null;
    songType: string | null;
    lengthSeconds: number | null;
  };
}

interface FavoritesGridProps {
  favorites: FavoriteSong[];
}

export function FavoritesGrid({ favorites }: FavoritesGridProps) {
  const [sortBy, setSortBy] = useState<"recent" | "title" | "views">("recent");

  /**
   * Handle sort change
   * rerender-functional-setstate: Functional update
   */
  const handleSortChange = useCallback((value: string) => {
    setSortBy(value as "recent" | "title" | "views");
  }, []);

  /**
   * Get display title for sorting
   */
  const getDisplayTitle = useCallback((song: FavoriteSong["song"]) => {
    return (
      song.titleKorean ||
      song.titleEnglish ||
      song.titleJapanese ||
      song.titleRomaji ||
      song.defaultName
    );
  }, []);

  /**
   * Sort favorites
   * rerender-memo: Memoized sorting logic
   */
  const sortedFavorites = useMemo(() => {
    const sorted = [...favorites];

    switch (sortBy) {
      case "title":
        sorted.sort((a, b) => {
          const titleA = getDisplayTitle(a.song).toLowerCase();
          const titleB = getDisplayTitle(b.song).toLowerCase();
          return titleA.localeCompare(titleB);
        });
        break;
      case "views":
        sorted.sort((a, b) => {
          const viewsA = a.song.viewCount ? parseInt(a.song.viewCount) : 0;
          const viewsB = b.song.viewCount ? parseInt(b.song.viewCount) : 0;
          return viewsB - viewsA;
        });
        break;
      case "recent":
      default:
        sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }

    return sorted;
  }, [favorites, sortBy, getDisplayTitle]);

  return (
    <div className="space-y-8">
      {/* Header Controls */}
      {favorites.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Count Display */}
          <div className="flex items-center gap-3">
            <div
              className={`
                p-3 rounded-full
                bg-gradient-to-br from-pink-500/20 to-rose-500/20
                border-2 border-pink-500/30
                shadow-lg shadow-pink-500/20
              `}
            >
              <Heart className="h-5 w-5 text-pink-400 fill-pink-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">내가 좋아하는</p>
              <p className="text-white font-bold text-2xl tabular-nums">
                <span className="text-pink-400">{favorites.length}</span>곡
              </p>
            </div>
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
                  focus:ring-2 focus:ring-pink-500/50
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
                  최근 추가순
                </SelectItem>
                <SelectItem
                  value="title"
                  className="text-white cursor-pointer focus:bg-white/10"
                >
                  제목순
                </SelectItem>
                <SelectItem
                  value="views"
                  className="text-white cursor-pointer focus:bg-white/10"
                >
                  조회수순
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Songs Grid */}
      {sortedFavorites.length === 0 ? (
        <div className="py-12">
          <EmptyState
            icon={Heart}
            title="아직 좋아하는 곡이 없습니다"
            description="마음에 드는 곡을 찾아 하트를 눌러보세요"
            actionLabel="차트 둘러보기"
            actionHref="/"
          />
        </div>
      ) : (
        <div
          className={`
            grid gap-6
            grid-cols-2 md:grid-cols-3 lg:grid-cols-4
          `}
        >
          {sortedFavorites.map((favorite, index) => (
            <div
              key={favorite.id}
              style={{
                animation: `fadeInUp 0.5s ease-out ${index * 30}ms backwards`,
              }}
            >
              <RankingSongCard
                song={{
                  vocadbId: favorite.song.vocadbId,
                  defaultName: favorite.song.defaultName,
                  titleKorean: favorite.song.titleKorean,
                  titleEnglish: favorite.song.titleEnglish,
                  titleJapanese: favorite.song.titleJapanese,
                  titleRomaji: favorite.song.titleRomaji,
                  artistString: favorite.song.artistString,
                  youtubeId: favorite.song.youtubeId,
                  youtubeUrl: favorite.song.youtubeUrl,
                  thumbUrl: favorite.song.thumbUrl,
                  viewCount: favorite.song.viewCount && favorite.song.viewCount !== ''
                    ? BigInt(favorite.song.viewCount)
                    : null,
                  viewCountUpdatedAt: null,
                  publishDate: favorite.song.publishDate,
                  songType: favorite.song.songType,
                  lengthSeconds: favorite.song.lengthSeconds,
                  rank: index + 1,
                  favoritedTimes: 0,
                  ratingScore: 0,
                }}
              />
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
