import { Metadata } from "next";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { PlaylistCard } from "@/components/user/PlaylistCard";
import { Plus, ListMusic } from "lucide-react";
import Link from "next/link";
import { getUserPlaylists } from "@/lib/db/user";
import { EmptyState } from "@/components/playlists/EmptyState";

export const metadata: Metadata = {
  title: "플레이리스트 | Vocatify",
  description: "나의 플레이리스트",
};

export default async function PlaylistsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/playlists");
  }

  // Fetch user playlists directly from database (server-side)
  const playlists = await getUserPlaylists(session.user.id);

  return (
    <div className="min-h-screen bg-black">
      {/* Header - Tidal Design */}
      <div className="border-b border-white/10 bg-black">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-4xl font-bold text-white mb-2"
                style={{ fontFamily: "Quicksand, sans-serif" }}
              >
                플레이리스트
              </h1>
              <p className="text-white/60 text-lg">
                {playlists.length}개의 플레이리스트
              </p>
            </div>
            <Link href="/playlists/create">
              <button
                className={`
                  flex items-center gap-2
                  rounded-full px-6 py-3
                  bg-[#CDFF00] text-black font-bold
                  transition-all duration-300
                  hover:bg-[#CDFF00]/90 hover:scale-105
                  active:scale-95
                  shadow-lg hover:shadow-[#CDFF00]/20
                `}
              >
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
          <EmptyState
            icon={ListMusic}
            title="아직 플레이리스트가 없습니다"
            description="나만의 플레이리스트를 만들어보세요"
            actionLabel="새 플레이리스트 만들기"
            actionHref="/playlists/create"
          />
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
