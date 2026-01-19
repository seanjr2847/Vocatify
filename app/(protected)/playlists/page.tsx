import { Metadata } from "next";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { PlaylistCard } from "@/components/user/PlaylistCard";
import { Plus, ListMusic } from "lucide-react";
import Link from "next/link";
import { getUserPlaylists, UserPlaylistSummary } from "@/lib/db/user";

export const metadata: Metadata = {
  title: "플레이리스트 | Vocatify",
  description: "나의 플레이리스트",
};

export default async function PlaylistsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  // Fetch user playlists directly from database (server-side)
  const playlists = await getUserPlaylists(session.user.id);

  return (
    <div className="min-h-screen bg-[#1d2123]">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-[#1a1a1a]">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">플레이리스트</h1>
              <p className="mt-2 text-neutral-400">
                {playlists.length}개의 플레이리스트
              </p>
            </div>
            <Link href="/playlists/create">
              <button className="flex items-center gap-2 rounded-lg bg-[#39c5bb] px-4 py-2 text-white transition-colors hover:bg-[#2da59a]">
                <Plus className="h-5 w-5" />
                새 플레이리스트
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Playlists Grid */}
      <div className="container mx-auto px-4 py-8">
        {playlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-neutral-800 bg-[#1a1a1a] py-20">
            <ListMusic className="mb-4 h-16 w-16 text-neutral-700" />
            <p className="mb-2 text-lg font-semibold text-neutral-400">
              플레이리스트가 없습니다
            </p>
            <p className="text-sm text-neutral-500">
              나만의 플레이리스트를 만들어보세요
            </p>
            <Link href="/playlists/create">
              <button className="mt-6 rounded-lg bg-[#39c5bb] px-6 py-2 text-white transition-colors hover:bg-[#2da59a]">
                새 플레이리스트 만들기
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {playlists.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                id={playlist.id}
                name={playlist.name}
                description={playlist.description}
                isPublic={playlist.isPublic}
                songCount={playlist.songCount}
                updatedAt={playlist.updatedAt}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
