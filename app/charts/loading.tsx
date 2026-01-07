import { RankingListSkeleton } from "@/components/skeletons";

export default function ChartsLoading() {
  return (
    <div className="bg-[#1d2123] min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Tab Navigation Skeleton */}
        <div className="flex gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 w-24 bg-white/10 rounded-full animate-pulse" />
          ))}
        </div>

        {/* Ranking List Skeleton */}
        <RankingListSkeleton count={10} />
      </div>
    </div>
  );
}
