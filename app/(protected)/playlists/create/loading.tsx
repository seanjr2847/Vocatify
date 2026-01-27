import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PlaylistFormSkeleton } from "@/components/playlists/PlaylistSkeleton";

/**
 * Playlist Create Loading State
 *
 * Vercel React Best Practices Applied:
 * - async-suspense-boundaries: Automatic loading UI with Suspense
 */

export default function CreatePlaylistLoading() {
  return (
    <div className="min-h-screen bg-black">
      {/* Header with back button */}
      <div className="border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/playlists"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
          >
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
            <span>플레이리스트로 돌아가기</span>
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header Skeleton */}
        <div className="mb-8 animate-pulse space-y-2">
          <div className="h-10 w-64 bg-white/10 rounded-lg" />
          <div className="h-6 w-96 bg-white/5 rounded-lg" />
        </div>

        {/* Form Card */}
        <div
          className={`
            bg-white/5 backdrop-blur-sm
            rounded-[20px] p-8
            border border-white/10
            shadow-xl
          `}
        >
          <PlaylistFormSkeleton />
        </div>
      </div>
    </div>
  );
}
