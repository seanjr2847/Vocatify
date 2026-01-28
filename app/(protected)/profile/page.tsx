import { Metadata } from "next";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { UserAvatar } from "@/components/auth/UserAvatar";
import { Heart, ListMusic } from "lucide-react";
import Link from "next/link";
import { getUserFavorites } from "@/lib/db/user";

export const metadata: Metadata = {
  title: "프로필 | Vocatify",
  description: "사용자 프로필 및 즐겨찾기",
};

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/profile");
  }

  // Fetch user favorites directly from database (server-side)
  const { favorites, total: totalFavorites } = await getUserFavorites(
    session.user.id,
    20,
    0
  );

  return (
    <div className="min-h-screen bg-[#1d2123]">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-[#1a1a1a]">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-6">
            <UserAvatar
              name={session.user.name}
              image={session.user.image}
              className="h-24 w-24"
            />
            <div>
              <h1 className="text-3xl font-bold text-white">
                {session.user.name}
              </h1>
              <p className="text-neutral-400">{session.user.email}</p>
              <div className="mt-4 flex gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  <span className="text-neutral-300">
                    즐겨찾기 {totalFavorites}곡
                  </span>
                </div>
                <Link
                  href="/playlists"
                  className="flex items-center gap-2 hover:text-[#39c5bb] transition-colors"
                >
                  <ListMusic className="h-4 w-4 text-[#39c5bb]" />
                  <span className="text-neutral-300">
                    플레이리스트 보기
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Favorites Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">즐겨찾기</h2>
          {totalFavorites > 20 && (
            <Link
              href="/profile?tab=favorites&all=true"
              className="text-sm text-[#39c5bb] hover:underline"
            >
              모두 보기 ({totalFavorites}곡)
            </Link>
          )}
        </div>

        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-neutral-800 bg-[#1a1a1a] py-20">
            <Heart className="mb-4 h-16 w-16 text-neutral-700" />
            <p className="mb-2 text-lg font-semibold text-neutral-400">
              즐겨찾기한 곡이 없습니다
            </p>
            <p className="text-sm text-neutral-500">
              마음에 드는 곡에 하트를 눌러보세요
            </p>
            <Link href="/">
              <button className="mt-6 rounded-lg bg-[#39c5bb] px-6 py-2 text-white transition-colors hover:bg-[#2da59a]">
                곡 둘러보기
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {favorites.map((favorite) => {
              const song = favorite.song;
              const displayTitle =
                song.titleKorean ||
                song.titleEnglish ||
                song.titleJapanese ||
                song.defaultName;

              return (
                <Link
                  key={favorite.id}
                  href={`/songs/${song.vocadbId}`}
                  className="group relative overflow-hidden rounded-lg border border-neutral-800 bg-[#1a1a1a] transition-all hover:border-[#39c5bb] hover:shadow-lg hover:shadow-[#39c5bb]/10"
                >
                  {/* Thumbnail */}
                  {song.thumbUrl ? (
                    <img
                      src={song.thumbUrl}
                      alt={displayTitle}
                      className="aspect-video w-full object-cover"
                    />
                  ) : (
                    <div className="aspect-video w-full bg-gradient-to-br from-[#39c5bb]/20 to-[#39c5bb]/5 flex items-center justify-center">
                      <ListMusic className="h-12 w-12 text-[#39c5bb]/40" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-white group-hover:text-[#39c5bb] transition-colors">
                      {displayTitle}
                    </h3>
                    {song.artistString && (
                      <p className="text-xs text-neutral-400 line-clamp-1">
                        {song.artistString}
                      </p>
                    )}
                    {song.viewCount && (
                      <p className="mt-2 text-xs text-neutral-500">
                        조회수 {Number(song.viewCount).toLocaleString()}회
                      </p>
                    )}
                  </div>

                  {/* Favorite Badge */}
                  <div className="absolute right-2 top-2 rounded-full bg-black/50 p-2 backdrop-blur-sm">
                    <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
