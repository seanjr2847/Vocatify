"use client";

import { ListMusic, Lock, Globe } from "lucide-react";
import Link from "next/link";

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
  const formattedDate = new Date(updatedAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Link href={`/playlists/${id}`}>
      <div className="group relative rounded-lg border border-neutral-800 bg-[#1a1a1a] p-6 transition-all hover:border-[#39c5bb] hover:shadow-lg hover:shadow-[#39c5bb]/10">
        {/* Icon */}
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-[#39c5bb]/20 to-[#39c5bb]/5">
          <ListMusic className="h-8 w-8 text-[#39c5bb]" />
        </div>

        {/* Title and Description */}
        <div className="mb-4">
          <h3 className="mb-2 text-lg font-semibold text-white group-hover:text-[#39c5bb] transition-colors line-clamp-2">
            {name}
          </h3>
          {description && (
            <p className="text-sm text-neutral-400 line-clamp-2">
              {description}
            </p>
          )}
        </div>

        {/* Meta Info */}
        <div className="flex items-center justify-between text-sm text-neutral-500">
          <div className="flex items-center gap-4">
            <span>{songCount}곡</span>
            <span>•</span>
            <div className="flex items-center gap-1">
              {isPublic ? (
                <>
                  <Globe className="h-3.5 w-3.5" />
                  <span>공개</span>
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  <span>비공개</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Last Updated */}
        <div className="mt-3 text-xs text-neutral-600">
          최종 수정: {formattedDate}
        </div>
      </div>
    </Link>
  );
}
