import { Globe } from "lucide-react";

/**
 * Loading state for public playlists page
 * Uses Next.js 15 automatic loading UI
 */

function PublicPlaylistCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="animate-pulse"
      style={{
        animationDelay: `${delay}ms`,
      }}
    >
      <div
        className={`
          h-64 rounded-[20px] border-2 border-white/10
          bg-gradient-to-br from-white/5 to-white/[0.02]
          backdrop-blur-sm p-6
        `}
      >
        {/* Badge skeleton */}
        <div className="flex justify-end mb-4">
          <div className="h-7 w-20 rounded-full bg-white/10" />
        </div>

        {/* Title skeleton */}
        <div className="space-y-2 mb-4">
          <div className="h-7 w-3/4 rounded bg-white/10" />
          <div className="h-7 w-1/2 rounded bg-white/10" />
        </div>

        {/* Description skeleton */}
        <div className="space-y-2 mb-6">
          <div className="h-4 w-full rounded bg-white/5" />
          <div className="h-4 w-5/6 rounded bg-white/5" />
          <div className="h-4 w-4/6 rounded bg-white/5" />
        </div>

        {/* Footer skeleton */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-white/10" />
            <div className="h-6 w-12 rounded bg-white/10" />
          </div>
          <div className="h-4 w-20 rounded bg-white/5" />
        </div>
      </div>
    </div>
  );
}

export default function PublicPlaylistsLoading() {
  return (
    <div className="min-h-screen bg-black">
      {/* Page Header */}
      <div className="border-b border-white/10 bg-black">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div
              className={`
                p-4 rounded-[20px]
                bg-gradient-to-br from-green-500/20 to-green-500/5
                border-2 border-green-500/30
              `}
            >
              <Globe className="h-8 w-8 text-green-400" />
            </div>
            <div>
              <h1
                className="text-4xl font-bold text-white mb-2"
                style={{ fontFamily: "Quicksand, sans-serif" }}
              >
                공개 플레이리스트
              </h1>
              <p className="text-white/60 text-lg">
                다른 사용자들이 공유한 플레이리스트를 탐색하세요
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Search and Sort Skeletons */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="h-12 w-full sm:max-w-md rounded-full bg-white/5 border-2 border-white/10 animate-pulse" />
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="h-4 w-8 rounded bg-white/10 animate-pulse" />
              <div className="h-12 w-[180px] rounded-full bg-white/5 border-2 border-white/10 animate-pulse" />
            </div>
          </div>

          {/* Results Count Skeleton */}
          <div className="h-5 w-48 rounded bg-white/5 animate-pulse" />

          {/* Grid Skeleton */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <PublicPlaylistCardSkeleton key={i} delay={i * 50} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
