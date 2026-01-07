import { Skeleton } from "@/components/ui/skeleton";
import { RelatedSongsCarouselSkeleton } from "@/components/skeletons";

export default function SongDetailLoading() {
  return (
    <div className="bg-[#1d2123] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Button Skeleton */}
        <Skeleton className="h-10 w-24 mb-6" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Song Header */}
            <div className="flex gap-6">
              <Skeleton className="w-48 h-48 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <div className="flex gap-4 pt-4">
                  <Skeleton className="h-10 w-28 rounded-full" />
                  <Skeleton className="h-10 w-28 rounded-full" />
                </div>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-[#1a1a1a] rounded-lg p-4">
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>

            {/* Chart Skeleton */}
            <div className="bg-[#1a1a1a] rounded-lg p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-[300px] w-full rounded" />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Ranking Badges */}
            <div className="bg-[#1a1a1a] rounded-lg p-4 space-y-3">
              <Skeleton className="h-5 w-24 mb-4" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded-full" />
              ))}
            </div>

            {/* Tags */}
            <div className="bg-[#1a1a1a] rounded-lg p-4">
              <Skeleton className="h-5 w-16 mb-4" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-16 rounded-full" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Related Songs */}
        <div className="mt-8">
          <Skeleton className="h-6 w-32 mb-4" />
          <RelatedSongsCarouselSkeleton count={5} />
        </div>
      </div>
    </div>
  );
}
