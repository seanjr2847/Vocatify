"use client";

import Link from "next/link";
import { Globe, ListMusic, Clock } from "lucide-react";
import { getRelativeTime } from "@/lib/utils/playlist";

/**
 * PublicPlaylistCard Component
 *
 * Discovery card with magnetic hover and glassmorphic styling
 * Vercel React Best Practices Applied:
 * - rendering-hoist-jsx: Static icon elements
 * - server-serialization: Accepts serialized date objects
 */

interface PublicPlaylistCardProps {
  id: string;
  name: string;
  description: string | null;
  songCount: number;
  updatedAt: Date;
  animationDelay?: number;
}

export function PublicPlaylistCard({
  id,
  name,
  description,
  songCount,
  updatedAt,
  animationDelay = 0,
}: PublicPlaylistCardProps) {
  const relativeTime = getRelativeTime(updatedAt);

  return (
    <Link
      href={`/playlists/${id}`}
      className="group block"
      style={{
        animation: `fadeInUp 0.6s ease-out ${animationDelay}ms backwards`,
      }}
    >
      <div
        className={`
          relative h-full
          rounded-[20px] border-2 border-white/10
          bg-gradient-to-br from-white/5 to-white/[0.02]
          backdrop-blur-sm p-6
          transition-all duration-500 ease-out
          hover:border-[#CDFF00]/50 hover:bg-white/10
          hover:scale-[1.02] hover:shadow-2xl hover:shadow-[#CDFF00]/10
          active:scale-[0.98]
          overflow-hidden
        `}
      >
        {/* Animated background glow on hover */}
        <div
          className={`
            absolute inset-0 opacity-0 group-hover:opacity-100
            bg-gradient-to-br from-[#CDFF00]/5 via-transparent to-transparent
            transition-opacity duration-500
            pointer-events-none
          `}
        />

        {/* Public Badge - Top Right */}
        <div className="absolute top-4 right-4">
          <div
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full
              bg-green-500/20 border border-green-500/30
              transition-all duration-300
              group-hover:bg-green-500/30 group-hover:border-green-500/50
              group-hover:shadow-lg group-hover:shadow-green-500/20
            `}
          >
            <Globe className="h-3.5 w-3.5 text-green-400" />
            <span className="text-xs font-bold text-green-400">PUBLIC</span>
          </div>
        </div>

        {/* Content */}
        <div className="relative flex flex-col h-full gap-4">
          {/* Title */}
          <h3
            className={`
              text-2xl font-bold text-white pr-24
              line-clamp-2 min-h-[3.5rem]
              transition-colors duration-300
              group-hover:text-[#CDFF00]
            `}
            style={{ fontFamily: "Quicksand, sans-serif" }}
          >
            {name}
          </h3>

          {/* Description */}
          {description ? (
            <p className="text-white/60 text-sm line-clamp-3 flex-1">
              {description}
            </p>
          ) : (
            <p className="text-white/30 text-sm italic flex-1">
              설명 없음
            </p>
          )}

          {/* Footer Info */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            {/* Song Count */}
            <div className="flex items-center gap-2">
              <div
                className={`
                  p-2 rounded-full
                  bg-[#CDFF00]/10 border border-[#CDFF00]/20
                  transition-all duration-300
                  group-hover:bg-[#CDFF00]/20 group-hover:border-[#CDFF00]/40
                `}
              >
                <ListMusic className="h-4 w-4 text-[#CDFF00]" />
              </div>
              <span className="text-white font-bold text-lg tabular-nums">
                {songCount}
              </span>
              <span className="text-white/40 text-sm">곡</span>
            </div>

            {/* Updated Time */}
            <div className="flex items-center gap-1.5 text-white/40 text-xs">
              <Clock className="h-3.5 w-3.5" />
              <span>{relativeTime}</span>
            </div>
          </div>
        </div>

        {/* Hover indicator - bottom accent */}
        <div
          className={`
            absolute bottom-0 left-0 right-0 h-1
            bg-gradient-to-r from-transparent via-[#CDFF00] to-transparent
            opacity-0 group-hover:opacity-100
            transition-opacity duration-500
          `}
        />
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </Link>
  );
}
