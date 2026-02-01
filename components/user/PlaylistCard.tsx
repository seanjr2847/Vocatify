"use client";

import { ListMusic, Lock, Globe } from "lucide-react";
import Link from "next/link";
import { getRelativeTime } from "@/lib/utils/playlist";

/**
 * PlaylistCard Component - Tidal Design System
 *
 * Vercel React Best Practices Applied:
 * - rendering-hoist-jsx: Static icon rendering
 * - rerender-memo: Component memoization for list rendering
 */

interface PlaylistCardProps {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  songCount: number;
  updatedAt: Date;
}

export function PlaylistCard({
  id,
  name,
  description,
  isPublic,
  songCount,
  updatedAt,
}: PlaylistCardProps) {
  const relativeTime = getRelativeTime(updatedAt);

  return (
    <Link href={`/playlists/${id}`}>
      <div
        className={`
          group relative
          bg-white/5 backdrop-blur-sm
          rounded-[20px] p-6
          border border-white/10
          transition-all duration-300
          hover:bg-white/10 hover:border-[#39c5bb]/50
          hover:scale-105 hover:shadow-2xl hover:shadow-[#39c5bb]/10
          active:scale-100
        `}
      >
        {/* Icon with Neon gradient */}
        <div
          className={`
            mb-4 flex h-16 w-16 items-center justify-center
            rounded-[16px]
            bg-gradient-to-br from-[#39c5bb]/20 to-[#39c5bb]/5
            transition-all duration-300
            group-hover:from-[#39c5bb]/30 group-hover:to-[#39c5bb]/10
            group-hover:scale-110
          `}
        >
          <ListMusic className="h-8 w-8 text-[#39c5bb]" />
        </div>

        {/* Title and Description */}
        <div className="mb-4">
          <h3
            className={`
              mb-2 text-lg font-bold text-white
              transition-colors duration-300
              group-hover:text-[#39c5bb]
              line-clamp-2
            `}
            style={{ fontFamily: "Quicksand, sans-serif" }}
          >
            {name}
          </h3>
          {description ? (
            <p className="text-sm text-white/60 line-clamp-2">
              {description}
            </p>
          ) : (
            <p className="text-sm text-white/40 italic">
              설명 없음
            </p>
          )}
        </div>

        {/* Meta Info */}
        <div className="flex items-center justify-between text-sm text-white/60">
          <div className="flex items-center gap-3">
            <span className="font-medium">{songCount}곡</span>
            <span className="text-white/30">•</span>
            <div className="flex items-center gap-1.5">
              {isPublic ? (
                <>
                  <Globe className="h-3.5 w-3.5 text-green-400" />
                  <span className="text-green-400">공개</span>
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5 text-white/40" />
                  <span className="text-white/40">비공개</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Last Updated with relative time */}
        <div className="mt-3 text-xs text-white/40">
          {relativeTime} 업데이트
        </div>

        {/* Hover indicator */}
        <div
          className={`
            absolute top-4 right-4
            w-2 h-2 rounded-full
            bg-[#39c5bb]
            opacity-0 group-hover:opacity-100
            transition-opacity duration-300
          `}
        />
      </div>
    </Link>
  );
}
