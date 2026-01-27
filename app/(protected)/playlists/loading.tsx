import { PlaylistSkeleton } from "@/components/playlists/PlaylistSkeleton";
import { Plus } from "lucide-react";

/**
 * Playlists Loading State
 *
 * Vercel React Best Practices Applied:
 * - async-suspense-boundaries: Automatic loading UI with Suspense
 * - rendering-hoist-jsx: Static skeleton structure
 */

export default function PlaylistsLoading() {
  return (
    <div className="min-h-screen bg-black">
      {/* Header Skeleton */}
      <div className="border-b border-white/10 bg-black">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            {/* Title skeleton */}
            <div className="animate-pulse space-y-2">
              <div className="h-10 w-48 bg-white/10 rounded-lg" />
              <div className="h-6 w-32 bg-white/5 rounded-lg" />
            </div>

            {/* Button skeleton */}
            <div className="flex items-center gap-2 h-12 w-48 bg-[#CDFF00]/20 rounded-full animate-pulse">
              <Plus className="h-5 w-5 text-[#CDFF00]/40 ml-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Playlists Grid Skeleton */}
      <div className="container mx-auto px-4 py-8">
        <PlaylistSkeleton count={8} />
      </div>
    </div>
  );
}
