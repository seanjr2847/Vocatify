"use client";

import { Skeleton } from "@/components/ui/skeleton";

// Category Card Skeleton (matches CategoryCard)
function CategoryCardSkeleton() {
  return (
    <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/5">
      <Skeleton className="absolute inset-0 rounded-none" />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      {/* Text area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

// Table Row Skeleton (matches TrendingTable/AllTimeBestTable rows)
function TableRowSkeleton({ showRank = true }: { showRank?: boolean }) {
  return (
    <div className="flex items-center gap-4 py-3 px-4 hover:bg-white/5 rounded-lg">
      {showRank && <Skeleton className="w-8 h-6" />}
      <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="hidden md:block h-4 w-20" />
      <Skeleton className="w-10 h-10 rounded-full" />
    </div>
  );
}

// New Release Card Skeleton (matches NewReleasesGrid)
function NewReleaseCardSkeleton() {
  return (
    <div className="group relative bg-white/5 rounded-xl overflow-hidden">
      <div className="aspect-square relative">
        <Skeleton className="absolute inset-0 rounded-none" />
      </div>
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function NavigationSectionSkeleton() {
  return (
    <section className="relative w-full tidal-bg">
      {/* THE HITS - Category Grid */}
      <div className="py-16 px-8">
        <div className="flex justify-between items-center mb-8">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <CategoryCardSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* TRENDING NOW - Table */}
      <div className="py-12 px-8">
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="bg-white/[0.02] rounded-2xl p-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRowSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* ALL-TIME BEST - Table */}
      <div className="py-12 px-8">
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="bg-white/[0.02] rounded-2xl p-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRowSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* NEW RELEASES - Grid */}
      <div className="py-12 px-8">
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <NewReleaseCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
