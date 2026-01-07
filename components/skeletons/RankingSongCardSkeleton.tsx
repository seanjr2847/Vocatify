"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function RankingSongCardSkeleton() {
  return (
    <div className="bg-[#1a1a1a] rounded-[20px] p-4">
      <div className="flex items-center gap-4">
        {/* Rank Number */}
        <Skeleton className="w-12 h-8" />

        {/* Thumbnail */}
        <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />

        {/* Song Info */}
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>

        {/* Action Buttons Placeholder */}
        <div className="flex items-center gap-2">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="w-12 h-12 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function RankingListSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <RankingSongCardSkeleton key={i} />
      ))}
    </div>
  );
}
