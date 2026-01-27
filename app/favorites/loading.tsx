import { Heart } from "lucide-react";
import { RankingSongCardSkeleton } from "@/components/skeletons/RankingSongCardSkeleton";

/**
 * Loading state for favorites page
 * Uses Next.js 15 automatic loading UI
 */

export default function FavoritesLoading() {
  return (
    <div className="min-h-screen bg-black">
      {/* Page Header Skeleton */}
      <div className="border-b border-white/10 bg-black relative overflow-hidden">
        {/* Ambient background glow */}
        <div
          className={`
            absolute inset-0 opacity-30
            bg-gradient-to-br from-pink-500/10 via-transparent to-rose-500/10
            pointer-events-none
          `}
        />

        <div className="container mx-auto px-4 py-12 relative">
          {/* Icon + Title */}
          <div className="flex items-center gap-6 mb-6">
            {/* Heart Icon */}
            <div className="relative">
              <div
                className={`
                  absolute inset-0 rounded-[24px]
                  bg-gradient-to-br from-pink-500 to-rose-500
                  opacity-20 blur-xl
                  animate-pulse
                `}
              />
              <div
                className={`
                  relative p-5 rounded-[24px]
                  bg-gradient-to-br from-pink-500/20 to-rose-500/20
                  border-2 border-pink-500/30
                  shadow-2xl shadow-pink-500/20
                `}
              >
                <Heart className="h-10 w-10 text-pink-400 fill-pink-400" />
              </div>
            </div>

            {/* Title Skeleton */}
            <div>
              <h1
                className="text-5xl font-bold text-white mb-2"
                style={{ fontFamily: "Quicksand, sans-serif" }}
              >
                즐겨찾기
              </h1>
              <p className="text-white/60 text-lg">
                마음에 담아둔 특별한 노래들
              </p>
            </div>
          </div>

          {/* Decorative accent line */}
          <div
            className={`
              h-1 w-32 rounded-full
              bg-gradient-to-r from-pink-500 to-rose-500
              shadow-lg shadow-pink-500/50
            `}
          />
        </div>
      </div>

      {/* Loading Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header Controls Skeleton */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Count Display Skeleton */}
            <div className="flex items-center gap-3">
              <div
                className={`
                  p-3 rounded-full
                  bg-gradient-to-br from-pink-500/20 to-rose-500/20
                  border-2 border-pink-500/30
                  animate-pulse
                `}
              >
                <Heart className="h-5 w-5 text-pink-400 fill-pink-400" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-24 rounded bg-white/5 animate-pulse" />
                <div className="h-7 w-16 rounded bg-white/10 animate-pulse" />
              </div>
            </div>

            {/* Sort Dropdown Skeleton */}
            <div className="flex items-center gap-3">
              <div className="h-4 w-8 rounded bg-white/10 animate-pulse" />
              <div className="h-12 w-[180px] rounded-full bg-white/5 border-2 border-white/10 animate-pulse" />
            </div>
          </div>

          {/* Grid Skeleton */}
          <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                style={{
                  animation: `fadeInUp 0.5s ease-out ${i * 30}ms backwards`,
                }}
              >
                <RankingSongCardSkeleton />
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
