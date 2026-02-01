/**
 * PlaylistSkeleton Component - Tidal Design System
 *
 * Vercel React Best Practices Applied:
 * - rendering-hoist-jsx: Static skeleton structure
 * - rerender-memo: No state changes, pure rendering
 * - rendering-content-visibility: Optimized for list rendering
 */

interface PlaylistSkeletonProps {
  count?: number;
}

/**
 * Individual playlist card skeleton
 * rendering-hoist-jsx: Extracted for reusability
 */
function PlaylistCardSkeleton() {
  return (
    <div
      className={`
        relative
        bg-white/5 backdrop-blur-sm
        rounded-[20px] p-6
        border border-white/10
        animate-pulse
      `}
    >
      {/* Icon skeleton */}
      <div
        className={`
          mb-4 h-16 w-16
          rounded-[16px]
          bg-white/10
        `}
      />

      {/* Title skeleton */}
      <div className="mb-3 space-y-2">
        <div className="h-6 w-3/4 bg-white/10 rounded-lg" />
        <div className="h-4 w-full bg-white/5 rounded-lg" />
      </div>

      {/* Meta info skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-4 w-12 bg-white/10 rounded-full" />
        <div className="h-1 w-1 bg-white/10 rounded-full" />
        <div className="h-4 w-16 bg-white/10 rounded-full" />
      </div>

      {/* Last updated skeleton */}
      <div className="mt-3 h-3 w-24 bg-white/5 rounded-full" />
    </div>
  );
}

/**
 * Playlist grid skeleton
 */
export function PlaylistSkeleton({ count = 8 }: PlaylistSkeletonProps) {
  // rendering-hoist-jsx: Generate array once
  const skeletonItems = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {skeletonItems.map((index) => (
        <PlaylistCardSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * Single playlist card skeleton for loading states
 */
export function PlaylistCardSkeletonSingle() {
  return <PlaylistCardSkeleton />;
}

/**
 * Playlist detail page skeleton
 */
export function PlaylistDetailSkeleton() {
  return (
    <div className="min-h-screen bg-black">
      {/* Header skeleton */}
      <div className="border-b border-white/10 bg-black animate-pulse">
        <div className="container mx-auto px-4 py-6">
          {/* Back button skeleton */}
          <div className="mb-6 h-5 w-48 bg-white/10 rounded-lg" />

          {/* Title and meta skeleton */}
          <div className="space-y-4">
            <div className="h-10 w-2/3 bg-white/10 rounded-lg" />
            <div className="h-6 w-full max-w-3xl bg-white/5 rounded-lg" />
            <div className="flex items-center gap-4">
              <div className="h-5 w-16 bg-white/10 rounded-full" />
              <div className="h-5 w-12 bg-white/10 rounded-full" />
              <div className="h-5 w-32 bg-white/10 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Songs list skeleton */}
      <div className="container mx-auto px-4 py-8">
        <PlaylistSongsSkeleton count={5} />
      </div>
    </div>
  );
}

/**
 * Playlist songs list skeleton
 */
export function PlaylistSongsSkeleton({ count = 5 }: { count?: number }) {
  const skeletonItems = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="space-y-3">
      {skeletonItems.map((index) => (
        <div
          key={index}
          className={`
            flex items-center gap-4
            rounded-[16px] border border-white/10
            bg-white/5 backdrop-blur-sm p-4
            animate-pulse
          `}
        >
          {/* Order number skeleton */}
          <div className="w-8 h-5 bg-white/10 rounded" />

          {/* Thumbnail skeleton */}
          <div className="h-16 w-24 rounded-[12px] bg-white/10" />

          {/* Song info skeleton */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-5 w-2/3 bg-white/10 rounded-lg" />
            <div className="h-4 w-1/2 bg-white/5 rounded-lg" />
          </div>

          {/* View count skeleton */}
          <div className="hidden sm:block h-4 w-20 bg-white/10 rounded-full" />

          {/* Duration skeleton */}
          <div className="h-4 w-12 bg-white/10 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * Form skeleton for create/edit dialogs
 */
export function PlaylistFormSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Name field skeleton */}
      <div className="space-y-2">
        <div className="h-5 w-32 bg-white/10 rounded" />
        <div className="h-12 w-full bg-white/10 rounded-lg" />
        <div className="h-4 w-16 bg-white/5 rounded" />
      </div>

      {/* Description field skeleton */}
      <div className="space-y-2">
        <div className="h-5 w-24 bg-white/10 rounded" />
        <div className="h-32 w-full bg-white/10 rounded-lg" />
        <div className="h-4 w-16 bg-white/5 rounded" />
      </div>

      {/* Toggle skeleton */}
      <div className="space-y-3">
        <div className="h-5 w-20 bg-white/10 rounded" />
        <div className="h-20 w-full bg-white/5 rounded-[12px] border border-white/10" />
      </div>

      {/* Button skeleton */}
      <div className="flex gap-3 pt-4">
        <div className="flex-1 h-12 bg-[#39c5bb]/20 rounded-full" />
        <div className="flex-1 h-12 bg-white/10 rounded-full" />
      </div>
    </div>
  );
}

/**
 * Compact skeleton for smaller areas
 */
export function CompactPlaylistSkeleton({ count = 3 }: { count?: number }) {
  const skeletonItems = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="space-y-3">
      {skeletonItems.map((index) => (
        <div
          key={index}
          className={`
            flex items-center gap-3 p-3
            rounded-[12px] bg-white/5
            animate-pulse
          `}
        >
          <div className="h-12 w-12 rounded-[8px] bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-white/10 rounded" />
            <div className="h-3 w-1/2 bg-white/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
