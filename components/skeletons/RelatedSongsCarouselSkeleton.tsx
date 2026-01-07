"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function RelatedSongCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-[200px] bg-[#1a1a1a] rounded-lg overflow-hidden">
      {/* Thumbnail */}
      <Skeleton className="aspect-square w-full" />

      {/* Song Info */}
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}

export function RelatedSongsCarouselSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="overflow-x-auto scrollbar-hide">
      <div className="flex gap-4 pb-4">
        {Array.from({ length: count }).map((_, i) => (
          <RelatedSongCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
