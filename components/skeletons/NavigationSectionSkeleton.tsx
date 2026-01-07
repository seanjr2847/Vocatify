"use client";

import { Skeleton } from "@/components/ui/skeleton";

function ChartCardSkeleton() {
  return (
    <div className="w-[269px] h-[188px] bg-[#1a1a1a] rounded-[20px] p-4">
      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        <Skeleton className="w-[63px] h-[63px] rounded flex-shrink-0" />

        {/* Info */}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>

      {/* Progress bar area */}
      <div className="mt-auto pt-8 space-y-2">
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-8" />
        </div>
      </div>
    </div>
  );
}

function NewReleaseCardSkeleton() {
  return (
    <div className="flex items-center gap-4 p-3 bg-[#1a1a1a] rounded-lg">
      <Skeleton className="w-12 h-12 rounded flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function NavigationSectionSkeleton() {
  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Top Charts Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <ChartCardSkeleton key={i} />
          ))}
        </div>
      </section>

      {/* New Releases Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <NewReleaseCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
