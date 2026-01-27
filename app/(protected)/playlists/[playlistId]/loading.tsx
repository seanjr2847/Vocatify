import { PlaylistDetailSkeleton } from "@/components/playlists/PlaylistSkeleton";

/**
 * Playlist Detail Loading State
 *
 * Vercel React Best Practices Applied:
 * - async-suspense-boundaries: Automatic loading UI with Suspense
 * - rendering-hoist-jsx: Static skeleton structure
 */

export default function PlaylistDetailLoading() {
  return <PlaylistDetailSkeleton />;
}
