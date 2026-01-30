"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface RankingSongCardSkeletonProps {
  isTopThree?: boolean;
}

export function RankingSongCardSkeleton({ isTopThree = false }: RankingSongCardSkeletonProps) {
  return (
    <div
      className={`bg-white/5 rounded-[20px] p-4 ${
        isTopThree ? 'shadow-[0_0_20px_rgba(205,255,0,0.08)]' : ''
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Rank Number */}
        <Skeleton
          className={`w-12 h-8 ${isTopThree ? 'bg-[#CDFF00]/10' : ''}`}
        />

        {/* Thumbnail */}
        <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />

        {/* Song Info */}
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Skeleton className="w-9 h-9 rounded-full" />
          <Skeleton className="w-11 h-11 rounded-full bg-[#39c5bb]/10" />
        </div>
      </div>
    </div>
  );
}

export function RankingListSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <RankingSongCardSkeleton key={i} isTopThree={i < 3} />
      ))}
    </div>
  );
}
