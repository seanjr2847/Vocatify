import { Skeleton } from "@/components/ui/skeleton";
import { RelatedSongsCarouselSkeleton } from "@/components/skeletons";

export default function SongDetailLoading() {
  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Button Skeleton */}
        <Skeleton className="h-10 w-24 mb-6 rounded-full" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Song Header */}
            <div className="flex gap-6">
              <div className="relative w-48 h-48 flex-shrink-0">
                <Skeleton className="absolute inset-0 rounded-xl" />
                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Skeleton className="w-14 h-14 rounded-full bg-[#39c5bb]/20" />
                </div>
              </div>
              <div className="flex-1 space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
                <div className="flex gap-3 pt-4">
                  <Skeleton className="h-11 w-32 rounded-full bg-[#39c5bb]/10" />
                  <Skeleton className="h-11 w-11 rounded-full" />
                  <Skeleton className="h-11 w-11 rounded-full" />
                </div>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-7 w-24" />
                </div>
              ))}
            </div>

            {/* Chart Skeleton */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-8 w-24 rounded-full" />
              </div>
              <Skeleton className="h-[300px] w-full rounded-lg" />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Ranking Badges */}
            <div className="bg-white/5 rounded-xl p-5 border border-white/5">
              <Skeleton className="h-5 w-24 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* External Links */}
            <div className="bg-white/5 rounded-xl p-5 border border-white/5">
              <Skeleton className="h-5 w-20 mb-4" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="bg-white/5 rounded-xl p-5 border border-white/5">
              <Skeleton className="h-5 w-16 mb-4" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-16 rounded-full" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Related Songs */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-20" />
          </div>
          <RelatedSongsCarouselSkeleton count={6} />
        </div>
      </div>
    </div>
  );
}
