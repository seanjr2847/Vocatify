import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { getUserFavorites } from "@/lib/db/user";
import { FavoritesGrid } from "@/components/favorites/FavoritesGrid";

/**
 * Favorites Page
 *
 * Personal collection of user's favorite songs
 * Vercel React Best Practices Applied:
 * - server-serialization: Fetch data server-side, serialize for client
 */

export const metadata: Metadata = {
  title: "즐겨찾기 | Vocatify",
  description: "내가 좋아하는 곡 모음",
};

export default async function FavoritesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin?callbackUrl=/favorites");
  }

  // Fetch favorites directly from database (server-side)
  const { favorites } = await getUserFavorites(session.user.id!, 500, 0);

  // Serialize BigInt for client
  const serializedFavorites = favorites.map((fav) => ({
    ...fav,
    song: {
      ...fav.song,
      viewCount: fav.song.viewCount?.toString() ?? null,
    },
  }));

  return (
    <div className="min-h-screen bg-black">
      {/* Page Header - Love Gallery Theme */}
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
            {/* Heart Icon with Gradient */}
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
                  transition-all duration-500
                  hover:scale-110 hover:shadow-pink-500/40
                `}
              >
                <Heart className="h-10 w-10 text-pink-400 fill-pink-400" />
              </div>
            </div>

            {/* Title Section */}
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

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <FavoritesGrid favorites={serializedFavorites} />
      </div>
    </div>
  );
}
