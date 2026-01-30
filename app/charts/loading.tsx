import { RankingListSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChartsLoading() {
  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Page Title */}
        <div className="mb-8">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>

        {/* Tab Navigation Skeleton */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              className={`h-10 px-6 rounded-full flex-shrink-0 ${
                i === 0 ? 'w-28 bg-[#CDFF00]/10' : 'w-24'
              }`}
            />
          ))}
        </div>

        {/* Ranking List Skeleton */}
        <RankingListSkeleton count={10} />

        {/* Load More Button Skeleton */}
        <div className="flex justify-center mt-8">
          <Skeleton className="h-12 w-40 rounded-full" />
        </div>
      </div>
    </div>
  );
}
